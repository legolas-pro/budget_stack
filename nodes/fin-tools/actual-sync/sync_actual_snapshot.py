#!/usr/bin/env python3
"""Mirror Actual SQLite snapshots into a stable read-only SQLite file for BI."""

from __future__ import annotations

import dataclasses
import datetime as dt
import hashlib
import json
import logging
import os
import pathlib
import sqlite3
import time

LOGGER = logging.getLogger("actual-sync")


def parse_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "t", "yes", "y", "on"}


def parse_extensions(raw: str | None) -> tuple[str, ...]:
    if not raw:
        return (".sqlite", ".sqlite3", ".db")

    parsed: list[str] = []
    for item in raw.split(","):
        ext = item.strip().lower()
        if not ext:
            continue
        if not ext.startswith("."):
            ext = f".{ext}"
        parsed.append(ext)

    return tuple(parsed) if parsed else (".sqlite", ".sqlite3", ".db")


@dataclasses.dataclass(frozen=True)
class Settings:
    actual_data_dir: pathlib.Path
    output_dir: pathlib.Path
    output_filename: str
    metadata_filename: str
    source_db_filename: str | None
    sync_interval_seconds: int
    run_once: bool
    scan_extensions: tuple[str, ...]
    skip_unchanged_snapshot: bool
    force_copy_every_cycle: bool
    set_output_readonly: bool
    health_success_file: pathlib.Path
    health_error_file: pathlib.Path


@dataclasses.dataclass(frozen=True)
class SnapshotCandidate:
    path: pathlib.Path
    main_mtime: float
    main_size: int
    wal_mtime: float
    wal_size: int
    shm_mtime: float
    shm_size: int
    tables: tuple[str, ...]

    @property
    def effective_mtime(self) -> float:
        return max(self.main_mtime, self.wal_mtime, self.shm_mtime)

    @property
    def signature(self) -> str:
        material = (
            f"{self.path}|{self.main_mtime}|{self.main_size}|"
            f"{self.wal_mtime}|{self.wal_size}|"
            f"{self.shm_mtime}|{self.shm_size}"
        )
        return hashlib.sha256(material.encode("utf-8")).hexdigest()


def load_settings() -> Settings:
    source_filename = (os.getenv("SOURCE_DB_FILENAME") or "").strip() or None

    return Settings(
        actual_data_dir=pathlib.Path(os.getenv("ACTUAL_DATA_DIR", "/actual-data")),
        output_dir=pathlib.Path(os.getenv("OUTPUT_DIR", "/bi-data")),
        output_filename=os.getenv("OUTPUT_FILENAME", "actual_bi.sqlite").strip()
        or "actual_bi.sqlite",
        metadata_filename=(
            os.getenv("METADATA_FILENAME", "actual_bi.metadata.json").strip()
            or "actual_bi.metadata.json"
        ),
        source_db_filename=source_filename,
        sync_interval_seconds=max(int(os.getenv("SYNC_INTERVAL_SECONDS", "180")), 10),
        run_once=parse_bool(os.getenv("RUN_ONCE"), default=False),
        scan_extensions=parse_extensions(os.getenv("SNAPSHOT_EXTENSIONS")),
        skip_unchanged_snapshot=parse_bool(
            os.getenv("SKIP_UNCHANGED_SNAPSHOT"), default=True
        ),
        force_copy_every_cycle=parse_bool(
            os.getenv("FORCE_COPY_EVERY_CYCLE"), default=False
        ),
        set_output_readonly=parse_bool(
            os.getenv("SET_OUTPUT_READONLY"), default=True
        ),
        health_success_file=pathlib.Path(
            os.getenv("HEALTH_SUCCESS_FILE", "/tmp/actual_sync_last_success")
        ),
        health_error_file=pathlib.Path(
            os.getenv("HEALTH_ERROR_FILE", "/tmp/actual_sync_last_error")
        ),
    )


def sidecar_stats(path: pathlib.Path) -> tuple[float, int]:
    if not path.exists():
        return (0.0, 0)

    stat = path.stat()
    return (stat.st_mtime, stat.st_size)


def is_sqlite_file(path: pathlib.Path) -> bool:
    try:
        with path.open("rb") as handle:
            magic = handle.read(16)
        return magic == b"SQLite format 3\x00"
    except OSError:
        return False


def get_sqlite_tables(db_path: pathlib.Path) -> tuple[str, ...]:
    query = """
        SELECT name
        FROM sqlite_master
        WHERE type='table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    """
    with sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True) as conn:
        rows = conn.execute(query).fetchall()
    return tuple(row[0] for row in rows)


def build_candidate(path: pathlib.Path) -> SnapshotCandidate | None:
    if not is_sqlite_file(path):
        return None

    try:
        tables = get_sqlite_tables(path)
    except sqlite3.DatabaseError:
        return None

    if not tables:
        return None

    try:
        main_stat = path.stat()
    except OSError:
        return None
    wal_path = pathlib.Path(f"{path.as_posix()}-wal")
    shm_path = pathlib.Path(f"{path.as_posix()}-shm")

    wal_mtime, wal_size = sidecar_stats(wal_path)
    shm_mtime, shm_size = sidecar_stats(shm_path)

    return SnapshotCandidate(
        path=path,
        main_mtime=main_stat.st_mtime,
        main_size=main_stat.st_size,
        wal_mtime=wal_mtime,
        wal_size=wal_size,
        shm_mtime=shm_mtime,
        shm_size=shm_size,
        tables=tables,
    )


def discover_snapshot(settings: Settings) -> SnapshotCandidate:
    if not settings.actual_data_dir.exists():
        raise RuntimeError(
            f"ACTUAL_DATA_DIR nao existe: {settings.actual_data_dir.as_posix()}"
        )

    candidates: list[SnapshotCandidate] = []
    for root, _, filenames in os.walk(settings.actual_data_dir):
        for filename in filenames:
            path = pathlib.Path(root) / filename

            if settings.source_db_filename and filename != settings.source_db_filename:
                continue

            if path.suffix.lower() not in settings.scan_extensions:
                continue

            try:
                if path.stat().st_size <= 0:
                    continue
            except FileNotFoundError:
                continue

            candidate = build_candidate(path)
            if candidate is None:
                continue
            candidates.append(candidate)

    if not candidates:
        if settings.source_db_filename:
            raise RuntimeError(
                "Nenhum snapshot SQLite valido encontrado para SOURCE_DB_FILENAME="
                f"{settings.source_db_filename}"
            )
        raise RuntimeError(
            "Nenhum snapshot SQLite valido foi encontrado no volume do Actual."
        )

    candidates.sort(key=lambda item: item.effective_mtime, reverse=True)
    return candidates[0]


def output_db_path(settings: Settings) -> pathlib.Path:
    return settings.output_dir / settings.output_filename


def metadata_path(settings: Settings) -> pathlib.Path:
    return settings.output_dir / settings.metadata_filename


def load_previous_signature(metadata_file: pathlib.Path) -> str | None:
    if not metadata_file.exists():
        return None

    try:
        payload = json.loads(metadata_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None

    signature = payload.get("source_signature")
    return str(signature) if signature else None


def write_metadata(
    settings: Settings,
    snapshot: SnapshotCandidate,
    synced_at: dt.datetime,
) -> None:
    metadata_file = metadata_path(settings)
    tmp_file = metadata_file.with_suffix(metadata_file.suffix + ".tmp")

    payload = {
        "synced_at": synced_at.isoformat(),
        "source_path": snapshot.path.as_posix(),
        "source_signature": snapshot.signature,
        "source": {
            "main": {"mtime": snapshot.main_mtime, "size": snapshot.main_size},
            "wal": {"mtime": snapshot.wal_mtime, "size": snapshot.wal_size},
            "shm": {"mtime": snapshot.shm_mtime, "size": snapshot.shm_size},
        },
        "table_count": len(snapshot.tables),
        "tables": list(snapshot.tables),
        "output_path": output_db_path(settings).as_posix(),
    }

    tmp_file.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    os.replace(tmp_file, metadata_file)

    if settings.set_output_readonly:
        os.chmod(metadata_file, 0o444)


def copy_snapshot_to_output(settings: Settings, snapshot: SnapshotCandidate) -> None:
    target = output_db_path(settings)
    tmp = target.with_suffix(target.suffix + ".tmp")

    settings.output_dir.mkdir(parents=True, exist_ok=True)

    if tmp.exists():
        tmp.unlink()

    source_uri = f"file:{snapshot.path.as_posix()}?mode=ro"
    source_conn = sqlite3.connect(source_uri, uri=True, timeout=30)
    dest_conn = sqlite3.connect(tmp.as_posix(), timeout=30)

    try:
        # O mirror de BI fica em modo classico para simplificar leitura externa.
        dest_conn.execute("PRAGMA journal_mode=DELETE")
        dest_conn.execute("PRAGMA synchronous=FULL")
        source_conn.backup(dest_conn, pages=1000)
        dest_conn.commit()
    finally:
        dest_conn.close()
        source_conn.close()

    os.replace(tmp, target)

    if settings.set_output_readonly:
        os.chmod(target, 0o444)


def mark_success(settings: Settings, message: str) -> None:
    settings.health_success_file.parent.mkdir(parents=True, exist_ok=True)
    settings.health_success_file.write_text(message + "\n", encoding="utf-8")


def mark_error(settings: Settings, message: str) -> None:
    settings.health_error_file.parent.mkdir(parents=True, exist_ok=True)
    settings.health_error_file.write_text(message + "\n", encoding="utf-8")


def run_once(settings: Settings) -> None:
    snapshot = discover_snapshot(settings)
    target = output_db_path(settings)
    meta_file = metadata_path(settings)

    LOGGER.info(
        "Fonte selecionada: %s (tables=%s, signature=%s)",
        snapshot.path.as_posix(),
        len(snapshot.tables),
        snapshot.signature,
    )

    previous_signature = load_previous_signature(meta_file)
    if (
        settings.skip_unchanged_snapshot
        and not settings.force_copy_every_cycle
        and previous_signature == snapshot.signature
        and target.exists()
    ):
        now = dt.datetime.now(tz=dt.timezone.utc)
        LOGGER.info("Snapshot inalterado. Mirror pulado.")
        mark_success(settings, f"{now.isoformat()} skipped_unchanged signature={snapshot.signature}")
        return

    started_at = dt.datetime.now(tz=dt.timezone.utc)
    copy_snapshot_to_output(settings, snapshot)
    write_metadata(settings, snapshot, started_at)

    LOGGER.info(
        "Mirror atualizado: %s <= %s",
        target.as_posix(),
        snapshot.path.as_posix(),
    )
    mark_success(
        settings,
        f"{started_at.isoformat()} ok source={snapshot.path.as_posix()} signature={snapshot.signature}",
    )


def configure_logging() -> None:
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=getattr(logging, log_level, logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
    )


def main() -> int:
    configure_logging()
    settings = load_settings()

    LOGGER.info(
        "Iniciando worker (source=%s, out=%s/%s, interval=%ss, once=%s)",
        settings.actual_data_dir.as_posix(),
        settings.output_dir.as_posix(),
        settings.output_filename,
        settings.sync_interval_seconds,
        settings.run_once,
    )

    if settings.run_once:
        try:
            run_once(settings)
            return 0
        except Exception as exc:  # noqa: BLE001
            LOGGER.exception("Falha no sync em modo RUN_ONCE")
            mark_error(
                settings,
                f"{dt.datetime.now(tz=dt.timezone.utc).isoformat()} error {exc}",
            )
            return 1

    while True:
        try:
            run_once(settings)
        except Exception as exc:  # noqa: BLE001
            LOGGER.exception("Falha no ciclo de sync")
            mark_error(
                settings,
                f"{dt.datetime.now(tz=dt.timezone.utc).isoformat()} error {exc}",
            )

        time.sleep(settings.sync_interval_seconds)


if __name__ == "__main__":
    raise SystemExit(main())
