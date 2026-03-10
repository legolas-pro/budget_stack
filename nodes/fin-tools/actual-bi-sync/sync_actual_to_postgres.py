#!/usr/bin/env python3
"""Sync Actual HTTP API data into PostgreSQL with idempotent upserts."""

from __future__ import annotations

import dataclasses
import datetime as dt
import decimal
import hashlib
import json
import logging
import os
import pathlib
import time
import urllib.parse
from typing import Any

import psycopg
from psycopg import sql
import requests

LOGGER = logging.getLogger("actual-bi-sync")
UTC = dt.timezone.utc
DEFAULT_ENTITY_ENDPOINTS = (
    "accounts",
    "transactions",
    "payees",
    "categories",
    "categorygroups",
    "schedules",
)

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS actual_sync_state (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  last_cycle_started_at TIMESTAMPTZ,
  last_cycle_finished_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  last_error_message TEXT,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS actual_budgets (
  budget_id TEXT PRIMARY KEY,
  name TEXT,
  source_hash TEXT NOT NULL,
  source_updated_at TIMESTAMPTZ,
  raw JSONB NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_actual_budgets_deleted
  ON actual_budgets (deleted_at);

CREATE TABLE IF NOT EXISTS actual_entities (
  entity_type TEXT NOT NULL,
  budget_id TEXT NOT NULL REFERENCES actual_budgets (budget_id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  name TEXT,
  amount NUMERIC(18,4),
  record_date DATE,
  source_hash TEXT NOT NULL,
  source_updated_at TIMESTAMPTZ,
  raw JSONB NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (entity_type, budget_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_actual_entities_type_budget_deleted
  ON actual_entities (entity_type, budget_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_actual_entities_record_date
  ON actual_entities (record_date);

CREATE OR REPLACE VIEW actual_active_transactions AS
SELECT
  budget_id,
  entity_id AS transaction_id,
  name,
  amount,
  record_date,
  source_updated_at,
  raw
FROM actual_entities
WHERE entity_type = 'transactions'
  AND deleted_at IS NULL;

CREATE OR REPLACE VIEW actual_active_accounts AS
SELECT
  budget_id,
  entity_id AS account_id,
  name,
  amount,
  source_updated_at,
  raw
FROM actual_entities
WHERE entity_type = 'accounts'
  AND deleted_at IS NULL;

CREATE OR REPLACE VIEW actual_active_category_groups AS
SELECT
  budget_id,
  entity_id AS category_group_id,
  name,
  source_updated_at,
  raw
FROM actual_entities
WHERE entity_type = 'categorygroups'
  AND deleted_at IS NULL;

CREATE OR REPLACE VIEW actual_active_schedules AS
SELECT
  budget_id,
  entity_id AS schedule_id,
  name,
  amount,
  record_date AS next_date,
  source_updated_at,
  raw
FROM actual_entities
WHERE entity_type = 'schedules'
  AND deleted_at IS NULL;
"""

UPSERT_BUDGET_SQL = """
INSERT INTO actual_budgets (
  budget_id,
  name,
  source_hash,
  source_updated_at,
  raw,
  first_seen_at,
  last_seen_at,
  deleted_at
) VALUES (
  %(budget_id)s,
  %(name)s,
  %(source_hash)s,
  %(source_updated_at)s,
  %(raw)s::jsonb,
  %(seen_at)s,
  %(seen_at)s,
  NULL
)
ON CONFLICT (budget_id) DO UPDATE SET
  name = EXCLUDED.name,
  source_hash = EXCLUDED.source_hash,
  source_updated_at = EXCLUDED.source_updated_at,
  raw = EXCLUDED.raw,
  last_seen_at = EXCLUDED.last_seen_at,
  deleted_at = NULL
WHERE actual_budgets.source_hash IS DISTINCT FROM EXCLUDED.source_hash
   OR actual_budgets.deleted_at IS NOT NULL;
"""

UPSERT_ENTITY_SQL = """
INSERT INTO actual_entities (
  entity_type,
  budget_id,
  entity_id,
  name,
  amount,
  record_date,
  source_hash,
  source_updated_at,
  raw,
  first_seen_at,
  last_seen_at,
  deleted_at
) VALUES (
  %(entity_type)s,
  %(budget_id)s,
  %(entity_id)s,
  %(name)s,
  %(amount)s,
  %(record_date)s,
  %(source_hash)s,
  %(source_updated_at)s,
  %(raw)s::jsonb,
  %(seen_at)s,
  %(seen_at)s,
  NULL
)
ON CONFLICT (entity_type, budget_id, entity_id) DO UPDATE SET
  name = EXCLUDED.name,
  amount = EXCLUDED.amount,
  record_date = EXCLUDED.record_date,
  source_hash = EXCLUDED.source_hash,
  source_updated_at = EXCLUDED.source_updated_at,
  raw = EXCLUDED.raw,
  last_seen_at = EXCLUDED.last_seen_at,
  deleted_at = NULL
WHERE actual_entities.source_hash IS DISTINCT FROM EXCLUDED.source_hash
   OR actual_entities.deleted_at IS NOT NULL;
"""


@dataclasses.dataclass(frozen=True)
class Settings:
    actual_http_api_base_url: str
    actual_http_api_key: str
    actual_http_timeout_seconds: int
    actual_http_verify_ssl: bool
    actual_http_retries: int
    actual_http_backoff_seconds: float
    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: str
    db_sslmode: str
    db_connect_timeout_seconds: int
    readonly_db_user: str | None
    readonly_db_password: str | None
    sync_interval_seconds: int
    run_once: bool
    endpoints: tuple[str, ...]
    budget_sync_id: str
    transactions_since_date: dt.date
    transactions_until_date: dt.date | None
    require_non_empty_budgets: bool
    fail_on_endpoint_error: bool
    health_success_file: pathlib.Path
    health_error_file: pathlib.Path


@dataclasses.dataclass(frozen=True)
class EndpointStats:
    endpoint: str
    total_records: int
    upserted_records: int
    deleted_records: int
    skipped_records: int


def normalize_endpoint_name(value: str) -> str:
    normalized = value.strip().lower()
    aliases = {
        "category-groups": "categorygroups",
        "category_groups": "categorygroups",
        "schedule": "schedules",
    }
    return aliases.get(normalized, normalized)


def extract_amount_value(record: dict[str, Any]) -> decimal.Decimal | None:
    direct = choose_first_decimal(record, ("amount", "amountInCents", "value"))
    if direct is not None:
        return direct

    amount = record.get("amount")
    if isinstance(amount, dict):
        for key in ("num1", "min", "value"):
            parsed = parse_decimal(amount.get(key))
            if parsed is not None:
                return parsed
    return None


def extract_record_date_value(record: dict[str, Any]) -> dt.date | None:
    direct = choose_first_date(
        record,
        (
            "next_date",
            "nextDate",
            "date",
            "startingBalanceDate",
            "importedAt",
            "createdAt",
        ),
    )
    if direct is not None:
        return direct

    date_value = record.get("date")
    if isinstance(date_value, dict):
        for key in ("start", "startDate", "date"):
            parsed = parse_date(date_value.get(key))
            if parsed is not None:
                return parsed
    return None


def parse_bool(value: str | None, *, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "t", "yes", "y", "on"}


def parse_csv(value: str | None, *, default: tuple[str, ...] = ()) -> tuple[str, ...]:
    if not value:
        return default
    parsed = tuple(item.strip() for item in value.split(",") if item.strip())
    return parsed if parsed else default


def truncate_error(message: str, *, limit: int = 1800) -> str:
    normalized = " ".join(message.split())
    if len(normalized) <= limit:
        return normalized
    return normalized[: limit - 3] + "..."


def utcnow() -> dt.datetime:
    return dt.datetime.now(tz=UTC)


def configure_logging() -> None:
    level = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=getattr(logging, level, logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
    )


def load_settings() -> Settings:
    api_base = (
        os.getenv("ACTUAL_HTTP_API_BASE_URL", "http://172.17.0.1:5007/v1")
        .strip()
        .rstrip("/")
    )
    api_key = (os.getenv("ACTUAL_HTTP_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("ACTUAL_HTTP_API_KEY is required")

    db_password = (os.getenv("DB_PASSWORD") or "").strip()
    if not db_password:
        raise RuntimeError("DB_PASSWORD is required")

    readonly_user = (os.getenv("READONLY_DB_USER") or "").strip() or None
    readonly_password = (os.getenv("READONLY_DB_PASSWORD") or "").strip() or None
    if readonly_user and not readonly_password:
        raise RuntimeError("READONLY_DB_PASSWORD is required when READONLY_DB_USER is set")
    budget_sync_id = (os.getenv("ACTUAL_BUDGET_SYNC_ID") or "").strip()
    if not budget_sync_id:
        raise RuntimeError("ACTUAL_BUDGET_SYNC_ID is required for the BI sync worker")
    transactions_since_date_raw = (
        os.getenv("ACTUAL_BI_TRANSACTIONS_SINCE_DATE") or "2000-01-01"
    ).strip()
    transactions_since_date = parse_date(transactions_since_date_raw)
    if transactions_since_date is None:
        raise RuntimeError(
            "ACTUAL_BI_TRANSACTIONS_SINCE_DATE must be a valid date (YYYY-MM-DD)"
        )
    transactions_until_date_raw = (
        os.getenv("ACTUAL_BI_TRANSACTIONS_UNTIL_DATE") or ""
    ).strip()
    transactions_until_date: dt.date | None = None
    if transactions_until_date_raw:
        transactions_until_date = parse_date(transactions_until_date_raw)
        if transactions_until_date is None:
            raise RuntimeError(
                "ACTUAL_BI_TRANSACTIONS_UNTIL_DATE must be a valid date (YYYY-MM-DD)"
            )

    configured_endpoints = parse_csv(
        os.getenv("ACTUAL_BI_ENDPOINTS"), default=DEFAULT_ENTITY_ENDPOINTS
    )
    normalized_endpoints = tuple(
        normalize_endpoint_name(item) for item in configured_endpoints
    )
    # categorygroups é dimensão importante para BI e deve estar sempre presente.
    endpoints = tuple(dict.fromkeys((*normalized_endpoints, "categorygroups")))

    return Settings(
        actual_http_api_base_url=api_base,
        actual_http_api_key=api_key,
        actual_http_timeout_seconds=max(
            int(os.getenv("ACTUAL_HTTP_TIMEOUT_SECONDS", "30")), 5
        ),
        actual_http_verify_ssl=parse_bool(
            os.getenv("ACTUAL_HTTP_VERIFY_SSL"), default=True
        ),
        actual_http_retries=max(int(os.getenv("ACTUAL_HTTP_RETRIES", "3")), 0),
        actual_http_backoff_seconds=max(
            float(os.getenv("ACTUAL_HTTP_BACKOFF_SECONDS", "2")), 0
        ),
        db_host=(os.getenv("DB_HOST") or "actual_bi_postgres").strip(),
        db_port=max(int(os.getenv("DB_PORT", "5432")), 1),
        db_name=(os.getenv("DB_NAME") or "actual_bi").strip(),
        db_user=(os.getenv("DB_USER") or "actual_bi").strip(),
        db_password=db_password,
        db_sslmode=(os.getenv("DB_SSLMODE") or "disable").strip(),
        db_connect_timeout_seconds=max(
            int(os.getenv("DB_CONNECT_TIMEOUT_SECONDS", "10")), 1
        ),
        readonly_db_user=readonly_user,
        readonly_db_password=readonly_password,
        sync_interval_seconds=max(int(os.getenv("SYNC_INTERVAL_SECONDS", "300")), 15),
        run_once=parse_bool(os.getenv("RUN_ONCE"), default=False),
        endpoints=endpoints,
        budget_sync_id=budget_sync_id,
        transactions_since_date=transactions_since_date,
        transactions_until_date=transactions_until_date,
        require_non_empty_budgets=parse_bool(
            os.getenv("ACTUAL_BI_REQUIRE_NON_EMPTY_BUDGETS"), default=True
        ),
        fail_on_endpoint_error=parse_bool(
            os.getenv("ACTUAL_BI_FAIL_ON_ENDPOINT_ERROR"), default=True
        ),
        health_success_file=pathlib.Path(
            os.getenv("HEALTH_SUCCESS_FILE", "/tmp/actual_bi_sync_last_success")
        ),
        health_error_file=pathlib.Path(
            os.getenv("HEALTH_ERROR_FILE", "/tmp/actual_bi_sync_last_error")
        ),
    )


def db_connect(settings: Settings) -> psycopg.Connection:
    return psycopg.connect(
        host=settings.db_host,
        port=settings.db_port,
        dbname=settings.db_name,
        user=settings.db_user,
        password=settings.db_password,
        sslmode=settings.db_sslmode,
        connect_timeout=settings.db_connect_timeout_seconds,
        autocommit=False,
    )


def ensure_schema(conn: psycopg.Connection) -> None:
    statements = [item.strip() for item in SCHEMA_SQL.split(";") if item.strip()]
    with conn.cursor() as cur:
        for statement in statements:
            cur.execute(statement)


def ensure_readonly_role(conn: psycopg.Connection, settings: Settings) -> None:
    if not settings.readonly_db_user or not settings.readonly_db_password:
        return

    role = settings.readonly_db_user
    password = settings.readonly_db_password

    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (role,))
        exists = cur.fetchone() is not None

        if exists:
            cur.execute(
                sql.SQL("ALTER ROLE {} LOGIN PASSWORD %s").format(sql.Identifier(role)),
                (password,),
            )
        else:
            cur.execute(
                sql.SQL("CREATE ROLE {} LOGIN PASSWORD %s").format(sql.Identifier(role)),
                (password,),
            )

        cur.execute(
            sql.SQL("GRANT CONNECT ON DATABASE {} TO {}").format(
                sql.Identifier(settings.db_name),
                sql.Identifier(role),
            )
        )
        cur.execute(
            sql.SQL("GRANT USAGE ON SCHEMA public TO {}").format(sql.Identifier(role))
        )
        cur.execute(
            sql.SQL("GRANT SELECT ON ALL TABLES IN SCHEMA public TO {}").format(
                sql.Identifier(role)
            )
        )
        cur.execute(
            sql.SQL(
                "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO {}"
            ).format(sql.Identifier(role))
        )


def stable_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, ensure_ascii=True, separators=(",", ":"))


def compute_source_hash(value: Any) -> str:
    material = stable_json(value).encode("utf-8")
    return hashlib.sha256(material).hexdigest()


def parse_timestamp(value: Any) -> dt.datetime | None:
    if value is None:
        return None
    if isinstance(value, dt.datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)
    if isinstance(value, (int, float)):
        if value > 10_000_000_000:
            value = value / 1000
        try:
            return dt.datetime.fromtimestamp(float(value), tz=UTC)
        except (ValueError, OSError):
            return None
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return None
        normalized = raw[:-1] + "+00:00" if raw.endswith("Z") else raw
        try:
            parsed = dt.datetime.fromisoformat(normalized)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=UTC)
            return parsed.astimezone(UTC)
        except ValueError:
            try:
                parsed_date = dt.datetime.strptime(raw, "%Y-%m-%d")
                return parsed_date.replace(tzinfo=UTC)
            except ValueError:
                return None
    return None


def parse_date(value: Any) -> dt.date | None:
    if value is None:
        return None
    if isinstance(value, dt.date) and not isinstance(value, dt.datetime):
        return value
    if isinstance(value, dt.datetime):
        return value.date()
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return None
        try:
            if len(raw) >= 10:
                return dt.date.fromisoformat(raw[:10])
        except ValueError:
            return None
    return None


def parse_decimal(value: Any) -> decimal.Decimal | None:
    if value is None:
        return None
    if isinstance(value, decimal.Decimal):
        return value
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return decimal.Decimal(str(value))
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return None
        try:
            return decimal.Decimal(raw)
        except decimal.InvalidOperation:
            return None
    return None


def extract_records(payload: Any, *, preferred_keys: tuple[str, ...]) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]

    if not isinstance(payload, dict):
        return []

    for key in preferred_keys:
        candidate = payload.get(key)
        if isinstance(candidate, list):
            return [item for item in candidate if isinstance(item, dict)]

    for key in ("data", "items", "results", "records"):
        candidate = payload.get(key)
        if isinstance(candidate, list):
            return [item for item in candidate if isinstance(item, dict)]

    return []


def choose_first_string(data: dict[str, Any], keys: tuple[str, ...]) -> str | None:
    for key in keys:
        value = data.get(key)
        if isinstance(value, str):
            normalized = value.strip()
            if normalized:
                return normalized
    return None


def choose_first_timestamp(data: dict[str, Any], keys: tuple[str, ...]) -> dt.datetime | None:
    for key in keys:
        value = data.get(key)
        parsed = parse_timestamp(value)
        if parsed is not None:
            return parsed
    return None


def choose_first_date(data: dict[str, Any], keys: tuple[str, ...]) -> dt.date | None:
    for key in keys:
        parsed = parse_date(data.get(key))
        if parsed is not None:
            return parsed
    return None


def choose_first_decimal(data: dict[str, Any], keys: tuple[str, ...]) -> decimal.Decimal | None:
    for key in keys:
        parsed = parse_decimal(data.get(key))
        if parsed is not None:
            return parsed
    return None


def extract_budget_id(budget: dict[str, Any]) -> str | None:
    candidate = choose_first_string(
        budget,
        (
            "syncId",
            "sync_id",
            "groupId",
            "group_id",
            "id",
            "budgetId",
            "budget_id",
            "cloudFileId",
            "cloud_file_id",
        ),
    )
    return candidate


def extract_entity_id(entity: dict[str, Any], entity_type: str) -> str:
    direct = choose_first_string(
        entity,
        (
            "id",
            "uuid",
            "transactionId",
            "transaction_id",
            "accountId",
            "account_id",
            "payeeId",
            "payee_id",
            "categoryId",
            "category_id",
        ),
    )
    if direct:
        return direct

    fallback = compute_source_hash(entity)[:24]
    return f"{entity_type}_{fallback}"


def build_session(settings: Settings) -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "x-api-key": settings.actual_http_api_key,
            "accept": "application/json",
        }
    )
    return session


def request_json(
    session: requests.Session,
    settings: Settings,
    path: str,
    *,
    params: dict[str, Any] | None = None,
) -> Any:
    url = f"{settings.actual_http_api_base_url}{path}"
    attempts = settings.actual_http_retries + 1
    last_error: Exception | None = None

    for attempt in range(1, attempts + 1):
        try:
            response = session.get(
                url,
                params=params,
                timeout=settings.actual_http_timeout_seconds,
                verify=settings.actual_http_verify_ssl,
            )
            if response.status_code >= 500 and attempt < attempts:
                LOGGER.warning(
                    "HTTP %s em %s (tentativa %s/%s), retry em %.1fs",
                    response.status_code,
                    path,
                    attempt,
                    attempts,
                    settings.actual_http_backoff_seconds,
                )
                time.sleep(settings.actual_http_backoff_seconds)
                continue

            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError) as exc:
            last_error = exc
            if attempt >= attempts:
                break
            LOGGER.warning(
                "Falha ao chamar %s (tentativa %s/%s): %s",
                path,
                attempt,
                attempts,
                exc,
            )
            time.sleep(settings.actual_http_backoff_seconds)

    raise RuntimeError(f"Falha HTTP em {path}: {last_error}") from last_error


def fetch_budgets(session: requests.Session, settings: Settings) -> list[dict[str, Any]]:
    def dedupe_by_budget_id(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        deduped: dict[str, dict[str, Any]] = {}
        for budget in records:
            budget_id = extract_budget_id(budget)
            if not budget_id:
                continue
            if budget_id in deduped:
                continue
            deduped[budget_id] = budget
        result = list(deduped.values())
        if len(result) < len(records):
            LOGGER.info(
                "Budgets deduplicados por budget_id: %s -> %s",
                len(records),
                len(result),
            )
        return result

    def budget_identity_candidates(budget: dict[str, Any]) -> set[str]:
        candidates = {
            extract_budget_id(budget),
            choose_first_string(budget, ("id", "budgetId", "budget_id")),
            choose_first_string(budget, ("syncId", "sync_id")),
            choose_first_string(budget, ("groupId", "group_id")),
            choose_first_string(budget, ("cloudFileId", "cloud_file_id")),
        }
        return {candidate for candidate in candidates if candidate}

    def filter_by_sync_id(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        target_sync_id = settings.budget_sync_id
        filtered: list[dict[str, Any]] = []
        for budget in records:
            if target_sync_id in budget_identity_candidates(budget):
                filtered.append(budget)
        return filtered

    payload = request_json(session, settings, "/budgets")
    records = extract_records(payload, preferred_keys=("budgets",))
    matched = filter_by_sync_id(records)
    if matched:
        return dedupe_by_budget_id(matched)

    # Fallback: alguns ambientes não listam /budgets de forma consistente,
    # mas aceitam consultas no budgetSyncId diretamente.
    safe_budget_sync_id = urllib.parse.quote(settings.budget_sync_id, safe="")
    scoped_path = f"/budgets/{safe_budget_sync_id}/budgets"
    try:
        scoped_payload = request_json(session, settings, scoped_path)
        scoped_records = extract_records(scoped_payload, preferred_keys=("budgets",))
        scoped_matched = filter_by_sync_id(scoped_records)
        if scoped_matched:
            LOGGER.info(
                "Budget resolvido via endpoint escopado %s (count=%s)",
                scoped_path,
                len(scoped_matched),
            )
            return dedupe_by_budget_id(scoped_matched)

        LOGGER.warning(
            "Nenhum budget correspondente em /budgets e %s; usando ACTUAL_BUDGET_SYNC_ID diretamente",
            scoped_path,
        )
        return [
            {
                "syncId": settings.budget_sync_id,
                "groupId": settings.budget_sync_id,
                "name": "Budget",
            }
        ]
    except Exception as scoped_exc:  # noqa: BLE001
        available_ids: list[str] = []
        for budget in records:
            available_ids.extend(sorted(budget_identity_candidates(budget)))
        if settings.require_non_empty_budgets:
            raise RuntimeError(
                "Nenhum budget correspondente a ACTUAL_BUDGET_SYNC_ID foi retornado por /budgets "
                f"e fallback {scoped_path} falhou ({scoped_exc}). "
                f"IDs disponiveis em /budgets: {sorted(set(available_ids)) or '[]'}"
            ) from scoped_exc
        return []


def fetch_endpoint_records(
    session: requests.Session,
    settings: Settings,
    budget_id: str,
    endpoint: str,
) -> list[dict[str, Any]]:
    if endpoint == "transactions":
        return fetch_transactions_records(session, settings, budget_id=budget_id)

    safe_budget_id = urllib.parse.quote(budget_id, safe="")
    path = f"/budgets/{safe_budget_id}/{endpoint}"
    payload = request_json(session, settings, path)
    return extract_records(payload, preferred_keys=(endpoint,))


def fetch_transactions_records(
    session: requests.Session,
    settings: Settings,
    *,
    budget_id: str,
) -> list[dict[str, Any]]:
    accounts = fetch_endpoint_records(session, settings, budget_id=budget_id, endpoint="accounts")
    if not accounts:
        return []

    safe_budget_id = urllib.parse.quote(budget_id, safe="")
    records: list[dict[str, Any]] = []
    for account in accounts:
        account_id = choose_first_string(account, ("id", "accountId", "account_id"))
        if not account_id:
            continue

        safe_account_id = urllib.parse.quote(account_id, safe="")
        path = f"/budgets/{safe_budget_id}/accounts/{safe_account_id}/transactions"
        params: dict[str, Any] = {
            "since_date": settings.transactions_since_date.isoformat()
        }
        if settings.transactions_until_date is not None:
            params["until_date"] = settings.transactions_until_date.isoformat()
        payload = request_json(session, settings, path, params=params)
        account_records = extract_records(payload, preferred_keys=("transactions",))
        records.extend(account_records)

    LOGGER.info(
        "Transacoes coletadas por conta: budget=%s accounts=%s records=%s",
        budget_id,
        len(accounts),
        len(records),
    )
    return records


def upsert_budget(
    conn: psycopg.Connection,
    budget: dict[str, Any],
    *,
    seen_at: dt.datetime,
) -> tuple[str, int]:
    budget_id = extract_budget_id(budget)
    if not budget_id:
        raise RuntimeError("Budget sem id valido retornado pela API")

    source_hash = compute_source_hash(budget)
    source_updated_at = choose_first_timestamp(
        budget, ("updatedAt", "updated_at", "lastModified", "modifiedAt", "createdAt")
    )
    params = {
        "budget_id": budget_id,
        "name": choose_first_string(budget, ("name",)),
        "source_hash": source_hash,
        "source_updated_at": source_updated_at,
        "raw": stable_json(budget),
        "seen_at": seen_at,
    }

    with conn.cursor() as cur:
        cur.execute(UPSERT_BUDGET_SQL, params)
        changed = cur.rowcount
    return budget_id, changed


def mark_deleted_budgets(
    conn: psycopg.Connection,
    *,
    seen_budget_ids: list[str],
    deleted_at: dt.datetime,
) -> int:
    with conn.cursor() as cur:
        if seen_budget_ids:
            cur.execute(
                """
                UPDATE actual_budgets
                SET deleted_at = %(deleted_at)s
                WHERE deleted_at IS NULL
                  AND NOT (budget_id = ANY(%(seen_budget_ids)s))
                """,
                {"deleted_at": deleted_at, "seen_budget_ids": seen_budget_ids},
            )
        else:
            cur.execute(
                """
                UPDATE actual_budgets
                SET deleted_at = %(deleted_at)s
                WHERE deleted_at IS NULL
                """,
                {"deleted_at": deleted_at},
            )
        return cur.rowcount


def upsert_entities(
    conn: psycopg.Connection,
    *,
    budget_id: str,
    endpoint: str,
    records: list[dict[str, Any]],
    seen_at: dt.datetime,
) -> EndpointStats:
    upserted = 0
    skipped = 0
    seen_entity_ids: set[str] = set()

    with conn.cursor() as cur:
        for record in records:
            if not isinstance(record, dict):
                skipped += 1
                continue

            entity_id = extract_entity_id(record, endpoint)
            if not entity_id:
                skipped += 1
                continue

            seen_entity_ids.add(entity_id)
            params = {
                "entity_type": endpoint,
                "budget_id": budget_id,
                "entity_id": entity_id,
                "name": choose_first_string(
                    record,
                    (
                        "name",
                        "description",
                        "payeeName",
                        "accountName",
                        "notes",
                    ),
                ),
                "amount": extract_amount_value(record),
                "record_date": extract_record_date_value(record),
                "source_hash": compute_source_hash(record),
                "source_updated_at": choose_first_timestamp(
                    record,
                    (
                        "next_date",
                        "nextDate",
                        "updatedAt",
                        "updated_at",
                        "lastModified",
                        "modifiedAt",
                        "importedAt",
                        "date",
                        "createdAt",
                    ),
                ),
                "raw": stable_json(record),
                "seen_at": seen_at,
            }
            cur.execute(UPSERT_ENTITY_SQL, params)
            upserted += cur.rowcount

        if seen_entity_ids:
            cur.execute(
                """
                UPDATE actual_entities
                SET deleted_at = %(deleted_at)s
                WHERE entity_type = %(entity_type)s
                  AND budget_id = %(budget_id)s
                  AND deleted_at IS NULL
                  AND NOT (entity_id = ANY(%(seen_entity_ids)s))
                """,
                {
                    "deleted_at": seen_at,
                    "entity_type": endpoint,
                    "budget_id": budget_id,
                    "seen_entity_ids": sorted(seen_entity_ids),
                },
            )
        else:
            cur.execute(
                """
                UPDATE actual_entities
                SET deleted_at = %(deleted_at)s
                WHERE entity_type = %(entity_type)s
                  AND budget_id = %(budget_id)s
                  AND deleted_at IS NULL
                """,
                {"deleted_at": seen_at, "entity_type": endpoint, "budget_id": budget_id},
            )
        deleted = cur.rowcount

    return EndpointStats(
        endpoint=endpoint,
        total_records=len(records),
        upserted_records=upserted,
        deleted_records=deleted,
        skipped_records=skipped,
    )


def update_sync_state_success(
    conn: psycopg.Connection,
    *,
    started_at: dt.datetime,
    finished_at: dt.datetime,
    stats: dict[str, Any],
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO actual_sync_state (
              id,
              last_cycle_started_at,
              last_cycle_finished_at,
              last_success_at,
              last_error_at,
              last_error_message,
              stats,
              updated_at
            ) VALUES (1, %(started_at)s, %(finished_at)s, %(finished_at)s, NULL, NULL, %(stats)s::jsonb, %(finished_at)s)
            ON CONFLICT (id) DO UPDATE SET
              last_cycle_started_at = EXCLUDED.last_cycle_started_at,
              last_cycle_finished_at = EXCLUDED.last_cycle_finished_at,
              last_success_at = EXCLUDED.last_success_at,
              last_error_at = NULL,
              last_error_message = NULL,
              stats = EXCLUDED.stats,
              updated_at = EXCLUDED.updated_at
            """,
            {
                "started_at": started_at,
                "finished_at": finished_at,
                "stats": stable_json(stats),
            },
        )


def update_sync_state_error(settings: Settings, *, error_message: str) -> None:
    now = utcnow()
    try:
        with db_connect(settings) as conn:
            ensure_schema(conn)
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO actual_sync_state (
                      id,
                      last_cycle_started_at,
                      last_cycle_finished_at,
                      last_success_at,
                      last_error_at,
                      last_error_message,
                      stats,
                      updated_at
                    ) VALUES (1, NULL, NULL, NULL, %(error_at)s, %(error_message)s, '{}'::jsonb, %(error_at)s)
                    ON CONFLICT (id) DO UPDATE SET
                      last_error_at = EXCLUDED.last_error_at,
                      last_error_message = EXCLUDED.last_error_message,
                      updated_at = EXCLUDED.updated_at
                    """,
                    {"error_at": now, "error_message": truncate_error(error_message)},
                )
            conn.commit()
    except Exception:  # noqa: BLE001
        LOGGER.exception("Falha ao gravar estado de erro em actual_sync_state")


def mark_success(settings: Settings, message: str) -> None:
    settings.health_success_file.parent.mkdir(parents=True, exist_ok=True)
    settings.health_success_file.write_text(message + "\n", encoding="utf-8")


def mark_error(settings: Settings, message: str) -> None:
    settings.health_error_file.parent.mkdir(parents=True, exist_ok=True)
    settings.health_error_file.write_text(message + "\n", encoding="utf-8")


def run_once(settings: Settings) -> None:
    started_at = utcnow()
    session = build_session(settings)

    with db_connect(settings) as conn:
        ensure_schema(conn)
        ensure_readonly_role(conn, settings)

        budgets = fetch_budgets(session, settings)
        seen_at = utcnow()

        seen_budget_ids: list[str] = []
        budget_changed = 0
        endpoint_summaries: list[dict[str, Any]] = []
        endpoint_errors: list[dict[str, str]] = []
        totals = {
            "budgets_seen": 0,
            "records_seen": 0,
            "records_upserted": 0,
            "records_deleted": 0,
            "records_skipped": 0,
        }

        for budget in budgets:
            budget_id, changed = upsert_budget(conn, budget, seen_at=seen_at)
            seen_budget_ids.append(budget_id)
            budget_changed += changed
            totals["budgets_seen"] += 1

            for endpoint in settings.endpoints:
                try:
                    records = fetch_endpoint_records(
                        session, settings, budget_id=budget_id, endpoint=endpoint
                    )
                except Exception as exc:  # noqa: BLE001
                    if settings.fail_on_endpoint_error:
                        raise
                    LOGGER.warning(
                        "Pulando endpoint %s para budget %s apos falha: %s",
                        endpoint,
                        budget_id,
                        exc,
                    )
                    endpoint_errors.append(
                        {
                            "budget_id": budget_id,
                            "endpoint": endpoint,
                            "error": truncate_error(str(exc), limit=300),
                        }
                    )
                    continue

                stats = upsert_entities(
                    conn,
                    budget_id=budget_id,
                    endpoint=endpoint,
                    records=records,
                    seen_at=seen_at,
                )
                endpoint_summaries.append(dataclasses.asdict(stats))
                totals["records_seen"] += stats.total_records
                totals["records_upserted"] += stats.upserted_records
                totals["records_deleted"] += stats.deleted_records
                totals["records_skipped"] += stats.skipped_records

        deleted_budgets = mark_deleted_budgets(
            conn, seen_budget_ids=seen_budget_ids, deleted_at=seen_at
        )

        finished_at = utcnow()
        full_stats = {
            "cycle_started_at": started_at.isoformat(),
            "cycle_finished_at": finished_at.isoformat(),
            "budget_changed": budget_changed,
            "budget_deleted": deleted_budgets,
            "totals": totals,
            "endpoints": endpoint_summaries,
            "endpoint_errors": endpoint_errors,
        }

        update_sync_state_success(
            conn,
            started_at=started_at,
            finished_at=finished_at,
            stats=full_stats,
        )
        conn.commit()

    LOGGER.info(
        "Ciclo concluido: budgets=%s records=%s upserted=%s deleted=%s skipped=%s",
        totals["budgets_seen"],
        totals["records_seen"],
        totals["records_upserted"],
        totals["records_deleted"],
        totals["records_skipped"],
    )
    mark_success(
        settings,
        (
            f"{finished_at.isoformat()} ok budgets={totals['budgets_seen']} "
            f"records={totals['records_seen']} upserted={totals['records_upserted']} "
            f"deleted={totals['records_deleted']} skipped={totals['records_skipped']}"
        ),
    )


def main() -> int:
    configure_logging()
    settings = load_settings()

    LOGGER.info(
        "Iniciando worker (api=%s, db=%s:%s/%s, interval=%ss, once=%s, sync_id=%s, tx_since=%s, tx_until=%s, endpoints=%s)",
        settings.actual_http_api_base_url,
        settings.db_host,
        settings.db_port,
        settings.db_name,
        settings.sync_interval_seconds,
        settings.run_once,
        settings.budget_sync_id,
        settings.transactions_since_date.isoformat(),
        (
            settings.transactions_until_date.isoformat()
            if settings.transactions_until_date is not None
            else "none"
        ),
        ",".join(settings.endpoints),
    )

    if settings.run_once:
        try:
            run_once(settings)
            return 0
        except Exception as exc:  # noqa: BLE001
            LOGGER.exception("Falha no sync em modo RUN_ONCE")
            message = f"{utcnow().isoformat()} error {exc}"
            mark_error(settings, message)
            update_sync_state_error(settings, error_message=str(exc))
            return 1

    while True:
        try:
            run_once(settings)
        except Exception as exc:  # noqa: BLE001
            LOGGER.exception("Falha no ciclo de sync")
            message = f"{utcnow().isoformat()} error {exc}"
            mark_error(settings, message)
            update_sync_state_error(settings, error_message=str(exc))
        time.sleep(settings.sync_interval_seconds)


if __name__ == "__main__":
    raise SystemExit(main())
