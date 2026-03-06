# Actual Snapshot Sync (SQLite View-Only)

Worker Python para gerar um SQLite espelho estavel do Actual para BI.

## O que ele faz

1. Escaneia `ACTUAL_DATA_DIR` e seleciona o SQLite mais recente.
2. Considera mudancas em `db + -wal + -shm` para evitar falso "sem alteracao".
3. Copia de forma consistente via `sqlite3.backup()` para um arquivo temporario.
4. Publica o espelho por troca atomica (`os.replace`) em `OUTPUT_FILENAME`.
5. Salva metadados em `METADATA_FILENAME` e healthcheck em `/tmp/actual_sync_last_success`.

## Variaveis principais

- `ACTUAL_DATA_DIR` (padrao: `/actual-data`)
- `OUTPUT_DIR` (padrao: `/bi-data`)
- `OUTPUT_FILENAME` (padrao: `actual_bi.sqlite`)
- `SOURCE_DB_FILENAME` (opcional, fixa o arquivo de origem)
- `SYNC_INTERVAL_SECONDS` (padrao: `180`)
- `SKIP_UNCHANGED_SNAPSHOT` (padrao: `true`)
- `FORCE_COPY_EVERY_CYCLE` (padrao: `false`)
- `SET_OUTPUT_READONLY` (padrao: `true`)
- `RUN_ONCE` (padrao: `false`)

## Build local

```bash
docker build -t actual-sync:local nodes/fin-tools/actual-sync/
```
