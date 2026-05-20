# Budget Stack

Stack Docker Swarm para orçamento pessoal com IA, BI e integração Open Finance.

Combina o [Actual Budget](https://actualbudget.org/) com serviços auxiliares para classificação automática de transações via LLM, sincronização para PostgreSQL para análise BI, e servidores MCP para integração com assistentes de IA.

## Arquitetura

| Serviço | Descrição | Porta padrão |
|---------|-----------|-------------|
| `app` | Actual Budget UI | `5006` |
| `api` | REST API ([actual-http-api](https://github.com/jhonderson/actual-http-api)) | `5007` |
| `actual_ai` | Classificação automática de transações via LLM | — |
| `actual_bi_postgres` | PostgreSQL para análise BI | `55432` |
| `actual_bi_sync` | Worker de sincronização API → PostgreSQL | — |
| `actual_mcp` | MCP Server para Actual Budget (SSE) | `3001` |
| `pluggy-mcp` | MCP Server para Open Finance via Pluggy (SSE) | `3002` |

## Pré-requisitos

- Docker com Swarm inicializado (`docker swarm init`)
- Credenciais do [Pluggy](https://dashboard.pluggy.ai) para o serviço `pluggy-mcp`
- Chave de API de um LLM (OpenAI, Anthropic, Groq, etc.) para o `actual_ai`

## Configuração

1. Copie o arquivo de exemplo e preencha as variáveis:

```bash
cp actual.env.example actual.env
```

2. Edite `actual.env` com suas credenciais reais. As variáveis obrigatórias estão marcadas com `<ALTERAR>`.

> **Segurança:** `actual.env` esta no `.gitignore` e nunca deve ser commitado. Nunca compartilhe esse arquivo.

## Deploy

```bash
docker stack deploy -c docker-compose.yaml actual_budget --env-file actual.env
```

Para derrubar a stack:

```bash
docker stack rm actual_budget
```

## Conectando os servidores MCP aos assistentes

Os servidores MCP rodam via SSE. Referência completa: [docs/pluggy-mcp-client-reference.md](docs/pluggy-mcp-client-reference.md)

### Claude Code

```bash
claude mcp add actual-mcp sse http://localhost:3001/sse
claude mcp add pluggy-mcp sse http://localhost:3002/sse
```

### Codex

```bash
codex mcp add sse actual-mcp http://localhost:3001/sse
codex mcp add sse pluggy-mcp http://localhost:3002/sse
```

### Gemini CLI

```bash
gemini mcp add sse actual-mcp http://localhost:3001/sse
gemini mcp add sse pluggy-mcp http://localhost:3002/sse
```

## Classificação automática com IA (Actual AI)

O serviço `actual_ai` usa o [actual-ai](https://github.com/sakowicz/actual-ai) para classificar transações automaticamente via LLM.

Importante: o `actual_ai` em si classifica transações já existentes. Se `syncAccountsBeforeClassify` estiver ativo, ele também dispara o bank sync do Actual antes de classificar; nesse modo, duplicações observadas tendem a vir da etapa de sync/importação, não do preenchimento de categoria.

Configure o provedor no `actual.env`:

```env
ACTUAL_AI_LLM_PROVIDER=openai          # openai | anthropic | groq | openrouter | google | ollama
ACTUAL_AI_OPENAI_API_KEY=sk-...
ACTUAL_AI_OPENAI_MODEL=gpt-4o-mini
```

Para manter classificação e importação desacopladas, o default versionado deixa `syncAccountsBeforeClassify` como opt-in em `ACTUAL_AI_FEATURES`.

O prompt de classificação (Sardinha) já está embutido no `docker-compose.yaml` e pode ser customizado via `PROMPT_TEMPLATE`.

## Sincronização BI

O `actual_bi_sync` puxa dados da REST API do Actual e faz upsert no PostgreSQL a cada `ACTUAL_BI_SYNC_INTERVAL_SECONDS` (padrão: 300s). Conecte qualquer ferramenta de BI (Metabase, Grafana, etc.) diretamente na porta `55432`.

## Variáveis de ambiente

Consulte [`actual.env.example`](actual.env.example) para a lista completa e documentada de todas as variáveis disponíveis.

## Licença

[MIT](LICENSE)
