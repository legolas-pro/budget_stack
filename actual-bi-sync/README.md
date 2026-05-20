# Actual BI Sync (Actual HTTP API -> PostgreSQL)

Worker Python para sincronizar dados do `actual-http-api` para PostgreSQL com:

1. Upsert idempotente (`ON CONFLICT`)
2. Soft delete (`deleted_at`) para registros removidos da origem
3. Estado de ciclo em `actual_sync_state`
4. Healthcheck por arquivo em `/tmp/actual_bi_sync_last_success`
5. Atualizacao de linha somente quando o `source_hash` muda (ou para reativar registro previamente deletado)

## Fluxo

1. Busca budgets em `/budgets`
2. Para cada budget, busca endpoints configurados (padrao: `accounts,transactions,payees,categories`)
3. Faz upsert em `actual_budgets` e `actual_entities`
4. Marca como `deleted_at` os registros nao vistos no ciclo
5. Grava metricas do ciclo em `actual_sync_state`

## Variaveis principais

- `ACTUAL_HTTP_API_BASE_URL` (ex.: `http://api:5007/v1` na stack ou `http://SEU-HOST:5007/v1` fora dela)
- `ACTUAL_HTTP_API_KEY`
- `ACTUAL_BUDGET_SYNC_ID` (UUID do budget unico a sincronizar)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `ACTUAL_BI_ENDPOINTS` (CSV)
- `SYNC_INTERVAL_SECONDS`
- `RUN_ONCE`
- `READONLY_DB_USER` / `READONLY_DB_PASSWORD` (opcional)

## Imagem

```bash
ghcr.io/legolas-pro/actual-bi-sync:latest
```
