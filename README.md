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

## Copiloto Sardinha — Skills Framework

O Copiloto Sardinha é o agente conversacional de análise financeira deste projeto. Ele opera em modo somente leitura sobre os dados do Actual Budget (via MCP) e implementa o Método Sardinha de orçamento base zero.

O copiloto é dividido em um **skill principal** (inicializador de sessão) e **sub-skills** por protocolo. Sempre carregue `/sardinha` primeiro — ele lê a persona completa em `sardinha_agent.md` e lista os sub-skills disponíveis.

| Skill | Comando | Função |
|---|---|---|
| `sardinha` | `/sardinha` | Inicializador obrigatório — carrega persona e contexto |
| `sardinha-posso-comprar` | `/sardinha-posso-comprar` | Validar qualquer compra antes de gastar |
| `sardinha-raio-x` | `/sardinha-raio-x` | Análise de risco: comprometimento dos próximos 6 meses |
| `sardinha-como-estamos` | `/sardinha-como-estamos` | Snapshot do mês: % real vs. meta por categoria |
| `sardinha-fechar-mes` | `/sardinha-fechar-mes` | Fechamento mensal e realocação de sobras |
| `sardinha-cartoes` | `/sardinha-cartoes` | Gestão de cartões, fechamentos e parcelamentos |
| `sardinha-orcamento` | `/sardinha-orcamento` | Alocar renda e zerar o "Para Orçar" |

> No Codex, substitua `/` por `$` em todos os comandos.

### Instalação dos skills

```bash
npx skills add legolas-pro/budget_stack --skill-path skills/sardinha
npx skills add legolas-pro/budget_stack --skill-path skills/sardinha-posso-comprar
npx skills add legolas-pro/budget_stack --skill-path skills/sardinha-raio-x
npx skills add legolas-pro/budget_stack --skill-path skills/sardinha-como-estamos
npx skills add legolas-pro/budget_stack --skill-path skills/sardinha-fechar-mes
npx skills add legolas-pro/budget_stack --skill-path skills/sardinha-cartoes
npx skills add legolas-pro/budget_stack --skill-path skills/sardinha-orcamento
```

Os skills dependem dos servidores MCP ativos (ver seção abaixo). Instale os MCPs antes de usar os sub-skills de análise.

---

## Conectando os servidores MCP aos assistentes

Os servidores MCP rodam via SSE. Referência completa: [docs/pluggy-mcp-client-reference.md](docs/pluggy-mcp-client-reference.md)

Execute os comandos a partir da raiz deste repositorio. Os exemplos abaixo usam escopo local/projeto, sem gravar os MCPs na configuracao global do usuario.

### Claude Code

```bash
claude mcp add --scope local --transport sse actual-mcp http://localhost:3001/sse
claude mcp add --scope local --transport sse pluggy-mcp http://localhost:3002/sse
```

### Codex

```bash
mkdir -p .codex
CODEX_HOME="$PWD/.codex" codex mcp add actual-mcp --url http://localhost:3001/sse
CODEX_HOME="$PWD/.codex" codex mcp add pluggy-mcp --url http://localhost:3002/sse
```

Ao iniciar o Codex para este projeto, use o mesmo `CODEX_HOME="$PWD/.codex"` para carregar esses MCPs locais.

### Gemini CLI

```bash
gemini mcp add --scope project --transport sse actual-mcp http://localhost:3001/sse
gemini mcp add --scope project --transport sse pluggy-mcp http://localhost:3002/sse
```

## Classificação automática com IA (Actual AI)

O serviço `actual_ai` usa o [actual-ai](https://github.com/sakowicz/actual-ai) para classificar transações automaticamente via LLM.

Importante: o `actual_ai` em si classifica transações já existentes. Nesta stack, o escopo de `FEATURES` ficou fixado no código para classificar sem `dryRun` e sem `syncAccountsBeforeClassify`.

Configure o provedor no `actual.env`:

```env
ACTUAL_AI_LLM_PROVIDER=openai          # openai | anthropic | groq | openrouter | google | ollama
ACTUAL_AI_OPENAI_API_KEY=sk-...
ACTUAL_AI_OPENAI_MODEL=gpt-4o-mini
```

Com isso, a stack deixa a classificação desacoplada da importação bancária e grava categoria de fato no orçamento.

O prompt de classificação (Sardinha) já está embutido no `docker-compose.yaml` e pode ser customizado via `PROMPT_TEMPLATE`.

## Sincronização BI

O `actual_bi_sync` puxa dados da REST API do Actual e faz upsert no PostgreSQL a cada `ACTUAL_BI_SYNC_INTERVAL_SECONDS` (padrão: 300s). Conecte qualquer ferramenta de BI (Metabase, Grafana, etc.) diretamente na porta `55432`.

## Variáveis de ambiente

Consulte [`actual.env.example`](actual.env.example) para a lista completa e documentada de todas as variáveis disponíveis.

## Licença

[MIT](LICENSE)
