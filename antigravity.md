# Budget Stack — Briefing Operacional

Compilado de contexto, arquitetura e entendimentos deste repositório para uso como contexto de sessão em assistentes de IA.

---

## 1. O que é este projeto

Stack Docker Swarm para orçamento pessoal com IA, BI e integração Open Finance. Combina o [Actual Budget](https://actualbudget.org/) com serviços auxiliares para:

- Classificação automática de transações via LLM (`actual_ai`)
- Sincronização para PostgreSQL para análise BI (`actual_bi_sync`)
- Servidores MCP para integração com assistentes de IA (`actual_mcp`, `pluggy-mcp`)

O orçamento segue o **Método Sardinha** (orçamento base zero com distribuição por categorias). A persona e filosofia completa estão em `sardinha_agent.md`.

---

## 2. Arquitetura — Serviços

| Serviço | Imagem | Porta | Função |
|---|---|---|---|
| `app` | `actualbudget/actual-server` | `5006` | Actual Budget UI e backend |
| `api` | `jhonderson/actual-http-api` | `5007` | REST API para Actual Budget |
| `actual_ai` | `sakowicz/actual-ai` | — | Classificação automática de transações via LLM |
| `actual_bi_postgres` | `postgres` | `55432` | PostgreSQL para análise BI |
| `actual_bi_sync` | `ghcr.io/legolas-pro/actual-bi-sync` | — | Worker: sincroniza API → PostgreSQL a cada N segundos |
| `actual_mcp` | imagem externa | `3001` | MCP Server (SSE) para Actual Budget |
| `pluggy-mcp` | `ghcr.io/legolas-pro/pluggy-mcp` | `3002` | MCP Server (SSE) para Open Finance via Pluggy |

**Deploy:**
```bash
docker stack deploy -c docker-compose.yaml actual_budget --env-file actual.env
docker stack rm actual_budget
```

**Variáveis de ambiente:** controladas via Portainer no ambiente implantado. `actual.env.example` é o template de referência, não a fonte de verdade do ambiente em produção.

---

## 3. Copiloto Sardinha — Skills Framework

O Copiloto Sardinha é o agente conversacional de análise financeira. Opera em modo **somente leitura** sobre os dados do Actual Budget via MCP. Nunca edita transações, categorias ou orçamentos — apenas lê, analisa e instrui o usuário a agir manualmente.

A persona completa (filosofia, protocolos, abordagem psicológica) está em `sardinha_agent.md`.

### Framework de skills

**Regra de uso:** carregue o skill principal antes de qualquer sub-skill.

| Skill | Comando Claude Code | Comando Antigravity | Função |
|---|---|---|---|
| `sardinha` | `/sardinha` | `$sardinha` | Inicializador — lê sardinha_agent.md, ativa contexto |
| `sardinha-posso-comprar` | `/sardinha-posso-comprar` | `$sardinha-posso-comprar` | Validar compra: SIM/NÃO/TALVEZ com base no saldo da categoria |
| `sardinha-raio-x` | `/sardinha-raio-x` | `$sardinha-raio-x` | Análise de risco: schedules dos próximos 6 meses, parecer VERDE/AMARELO/VERMELHO |
| `sardinha-como-estamos` | `/sardinha-como-estamos` | `$sardinha-como-estamos` | Snapshot do mês: % real vs. meta por categoria |
| `sardinha-fechar-mes` | `/sardinha-fechar-mes` | `$sardinha-fechar-mes` | Fechamento mensal: sobras → Liberdade Financeira, déficits → aprendizado |
| `sardinha-cartoes` | `/sardinha-cartoes` | `$sardinha-cartoes` | Cartões de crédito: fechamentos, parcelamentos, ilusão do limite |
| `sardinha-orcamento` | `/sardinha-orcamento` | `$sardinha-orcamento` | Alocar renda, zerar o "Para Orçar" (To Be Budgeted) |

Os skills de cliente estão em `client/skills/`. As skills internas para edição e manutenção deste repositório ficam em `.agents/skills/`.

### Distribuição Sardinha — referência rápida

| Categoria | Meta % | Sinal de alerta |
|---|---|---|
| Necessidades | máx 40% | Acima de 40%: família vulnerável a imprevistos |
| Conforto | máx 20% | Primeiro a cortar em emergência |
| Liberdade Financeira | 25% | Abaixo de 15%: Quest pausada |
| Conhecimento | 5% | — |
| Metas | 5% | Parcela só cabe se couber nos 5% mensais |
| Prazeres | 5% | Zerar extingue o comportamento de poupar a longo prazo |

---

## 4. MCPs Disponíveis

### actual-mcp (porta 3001)

MCP Server para o Actual Budget via SSE. O catálogo de tools não está versionado neste repo — fazer descoberta em runtime via `tools/list`.

Famílias de tools inferidas: budget, contas, transações, categorias, schedules, payees, regras. Escrita possível — aplicar protocolo de confirmação dupla para operações críticas.

Conexão:
```bash
# Claude Code
claude mcp add --scope local --transport sse actual-mcp http://localhost:3001/sse

# Antigravity / Codex
mkdir -p .codex
CODEX_HOME="$PWD/.codex" codex mcp add actual-mcp --url http://localhost:3001/sse

# Gemini CLI
gemini mcp add --scope project --transport sse actual-mcp http://localhost:3001/sse
```

### pluggy-mcp (porta 3002)

MCP Server para Open Finance via Pluggy API. Fonte do código: `pluggy-openapis3-mcp-build/src/src/index.ts`.

**Tools confirmadas (somente leitura no estado atual):**

| Tool | Parâmetros obrigatórios | Função |
|---|---|---|
| `listConnectors` | `fullPrompt` | Lista instituições financeiras disponíveis |
| `getAccounts` | `fullPrompt`, `itemId` | Contas de um item Pluggy |
| `getTransactions` | `fullPrompt`, `accountId` | Transações de uma conta (filtros: `from`, `to`, `pageSize`, `page`) |

Healthcheck: `curl http://localhost:3002/health` → `{"status":"OK","server":"pluggy-api","version":"1.0.0"}`

Conexão: mesmos comandos do actual-mcp, porta `3002`.

---

## 5. Protocolo de Uso dos MCPs

### Descoberta obrigatória no início de cada sessão

Para cada MCP conectado, executar `tools/list` e construir catálogo local com:
- `tool_name`, `required_params`, `optional_params`
- `side_effect`: `read` | `write` | `unknown`
- `idempotency`: `yes` | `no` | `unknown`

Se `side_effect` for `unknown`, tratar como `write` até provar o contrário.

### Política de confirmação

| Risco | Exemplos | Política |
|---|---|---|
| Read | list, get, search, query | Executa direto |
| Write-Moderado | criar/atualizar metadados sem impacto contábil | Preview + confirmar 1 vez |
| Write-Crítico | criar/atualizar/deletar transações, contas, orçamentos | Confirmar 2 vezes (intenção + resumo final) |

### Contrato mínimo

- Datas: sempre `YYYY-MM-DD`
- Valores: inteiros em centavos (`-5000` = -R$50,00). Despesas negativas, receitas positivas.
- Em escrita: sempre fazer leitura de verificação pós-escrita e mostrar antes/depois
- Em falha de escrita: não fazer retry cego — parar e solicitar decisão

---

## 6. Serviço actual_ai — Classificação Automática

Classifica transações existentes no Actual Budget via LLM. Não cria transações novas.

**Escopo fixado no código:**
- `classifyOnStartup` — classifica ao subir
- `rerunMissedTransactions` — reclassifica as perdidas
- `freeWebSearch` — ajuda em payees ambíguos
- `syncAccountsBeforeClassify` está **fora** do escopo fixado (evita acoplar classificação com bank sync)

**Tags padrão:**
- `#sardinha-ai` — classificado com confiança
- `#sardinha-revisar` — não classificado, requer revisão humana

**Configuração do provedor** (`actual.env`):
```env
ACTUAL_AI_LLM_PROVIDER=openrouter    # openai | anthropic | groq | openrouter | google | ollama
ACTUAL_AI_OPENAI_API_KEY=sk-...
ACTUAL_AI_OPENAI_MODEL=anthropic/claude-3-haiku
# Para OpenRouter, o endpoint padrão já está definido no docker-compose.yaml
```

O prompt de classificação (postura Sardinha: conservador, sem chute, apenas categorias existentes) está embutido no `docker-compose.yaml` via `PROMPT_TEMPLATE`.

---

## 7. Serviço actual_bi_sync

Worker que puxa dados da REST API do Actual e faz upsert no PostgreSQL a cada `ACTUAL_BI_SYNC_INTERVAL_SECONDS` (padrão: 300s).

Conecte qualquer ferramenta de BI (Metabase, Grafana, etc.) diretamente na porta `55432`.

---

## 8. Entendimentos Técnicos Consolidados

- O controle efetivo das variáveis de ambiente da stack é feito via **Portainer**. `actual.env.example` não é a fonte de verdade do ambiente implantado.
- O `actual_ai` classifica transações existentes atualizando `category` e `notes`. Não cria transações novas.
- A duplicação de transações observada em sessão anterior foi associada ao `syncAccountsBeforeClassify` estar ativo no ambiente efetivo. Este feature está fora do escopo fixado nesta stack.
- O `actual_mcp` vem de imagem externa — o catálogo de tools só é conhecido em runtime via `tools/list`.
- O `pluggy-mcp` não tem autenticação própria na borda. Se exposto na internet, proteger com rede privada ou proxy autenticado.
- O endpoint correto do `pluggy-mcp` é `/sse`. Não usa `streamableHttp` nem `/mcp`.

---

## 9. Estrutura do Repositório

```
budget_stack/
├── docker-compose.yaml          # stack principal
├── actual.env.example           # template de variáveis (não commitar actual.env)
├── sardinha_agent.md            # persona completa do Copiloto Sardinha
├── antigravity.md               # este arquivo — briefing operacional completo
├── codex.md                     # contexto para Codex CLI
├── client/
│   └── skills/                  # skills de cliente para Claude Code / Codex / Antigravity
│       ├── sardinha/            # inicializador
│       ├── sardinha-posso-comprar/
│       ├── sardinha-raio-x/
│       ├── sardinha-como-estamos/
│       ├── sardinha-fechar-mes/
│       ├── sardinha-cartoes/
│       └── sardinha-orcamento/
├── docs/
│   ├── WORKFLOW.md              # git workflow e deploy
│   ├── actual-ai-sardinha.md    # integração actual_ai + Sardinha
│   ├── briefing-agente-mcp-financas.md  # protocolo de uso dos MCPs
│   └── pluggy-mcp-client-reference.md   # referência de conexão do pluggy-mcp
└── pluggy-openapis3-mcp-build/  # código-fonte do pluggy-mcp
```

---

## 10. Workflow Git

- `main` → produção
- `develop` → staging
- `feature/*` → trabalho do dia a dia (base: develop)
- `hotfix/*` → correções urgentes (base: main)

Commits: Conventional Commits (`feat`, `fix`, `chore`, `docs`, `refactor`).

Deploy automatizado por merge nas branches correspondentes. Tags SemVer em `main` após promoção.
