# Budget Stack — Contexto para Gemini CLI

Compilado de contexto, arquitetura e entendimentos deste repositório.

---

## O que é este projeto

Stack Docker Swarm para orçamento pessoal com IA, BI e integração Open Finance. Combina o [Actual Budget](https://actualbudget.org/) com serviços auxiliares para classificação automática de transações via LLM, sincronização para PostgreSQL para análise BI, e servidores MCP para integração com assistentes de IA.

O orçamento segue o **Método Sardinha** (orçamento base zero com distribuição por categorias). A persona e filosofia completa estão em `sardinha_agent.md`.

---

## Arquitetura — Serviços

| Serviço | Porta | Função |
|---|---|---|
| `app` | `5006` | Actual Budget UI e backend |
| `api` | `5007` | REST API para Actual Budget |
| `actual_ai` | — | Classificação automática de transações via LLM |
| `actual_bi_postgres` | `55432` | PostgreSQL para análise BI |
| `actual_bi_sync` | — | Worker: sincroniza API → PostgreSQL |
| `actual_mcp` | `3001` | MCP Server SSE para Actual Budget |
| `pluggy-mcp` | `3002` | MCP Server SSE para Open Finance via Pluggy |

Variáveis de ambiente controladas via Portainer. `actual.env.example` é o template de referência — não é a fonte de verdade do ambiente implantado.

---

## Copiloto Sardinha

O Copiloto Sardinha é o agente conversacional de análise financeira deste projeto. Opera em modo **somente leitura** sobre os dados do Actual Budget via MCP. Nunca edita transações, categorias ou orçamentos — apenas lê, analisa e instrui o usuário a agir manualmente no app.

A persona completa (filosofia do Método Sardinha, protocolos operacionais, abordagem psicológica) está em `sardinha_agent.md`. Leia esse arquivo ao iniciar qualquer sessão de análise financeira.

### Protocolos disponíveis

| Protocolo | Gatilho natural | O que faz |
|---|---|---|
| Posso Comprar? | "posso comprar X", decisão de compra | Verifica saldo da categoria, projeta impacto de parcelamentos, responde SIM/NÃO/TALVEZ |
| Raio-X | "raio-x", "análise de risco" | Lista schedules dos próximos 6 meses, calcula comprometimento, emite VERDE/AMARELO/VERMELHO |
| Como Estamos? | "como estamos", "resumo do mês" | Snapshot: % real de cada categoria vs. meta da Distribuição Sardinha |
| Fechar o Mês | "fechar o mês" | Identifica sobras e déficits, sugere realocação para Liberdade Financeira |
| Cartões | compra em cartão, parcelamento | Protocolo de fechamento, ilusão do limite, parcelamentos com Schedule |
| Orçamento | "alocar renda", "Para Orçar positivo" | Distribui renda nas categorias conforme as metas, zera o To Be Budgeted |

### Distribuição Sardinha — referência rápida

| Categoria | Meta % |
|---|---|
| Necessidades | máx 40% |
| Conforto | máx 20% |
| Liberdade Financeira | 25% |
| Conhecimento | 5% |
| Metas | 5% |
| Prazeres | 5% |

---

## MCPs — Conexão

```bash
gemini mcp add --scope project --transport sse actual-mcp http://localhost:3001/sse
gemini mcp add --scope project --transport sse pluggy-mcp http://localhost:3002/sse
```

**actual-mcp (porta 3001):** catálogo de tools descoberto em runtime via `tools/list`. Escrita possível — aplicar dupla confirmação para operações críticas (transações, contas, orçamentos).

**pluggy-mcp (porta 3002):** tools de leitura (`listConnectors`, `getAccounts`, `getTransactions`). Healthcheck: `curl http://localhost:3002/health`.

---

## Protocolo de uso dos MCPs

- Valores monetários: inteiros em centavos. `-5000` = -R$50,00. Despesas negativas, receitas positivas.
- Datas: sempre `YYYY-MM-DD`.
- Tools de escrita crítica: confirmar 2 vezes antes de executar.
- Após escrita: executar leitura de verificação e mostrar antes/depois.
- Em falha de escrita: não fazer retry cego — parar e solicitar decisão.

---

## actual_ai — Classificação Automática

Classifica transações existentes via LLM. Não cria transações novas. `syncAccountsBeforeClassify` está fora do escopo fixado nesta stack — classificação e bank sync são fluxos separados.

Tags padrão: `#sardinha-ai` (classificado) e `#sardinha-revisar` (requer revisão humana).

---

## Entendimentos Técnicos

- Portainer é o ponto de controle de variáveis em produção.
- `actual_mcp` é imagem externa — catálogo de tools só disponível em runtime.
- `pluggy-mcp` não tem autenticação na borda. Proteger com rede privada se exposto externamente.
- Endpoint correto do `pluggy-mcp`: `/sse`. Não usa `streamableHttp` nem `/mcp`.
- Duplicação de transações em sessão anterior foi causada por `syncAccountsBeforeClassify` ativo no ambiente efetivo.
