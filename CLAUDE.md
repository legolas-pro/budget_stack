# Budget Stack — Contexto para Claude Code

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

## Copiloto Sardinha — Skills

O Copiloto Sardinha é o agente conversacional de análise financeira. Opera em modo **somente leitura** sobre os dados do Actual Budget via MCP. Nunca edita transações, categorias ou orçamentos.

**Regra de sessão:** sempre carregue `/sardinha` primeiro.

| Skill | Comando | Função |
|---|---|---|
| `sardinha` | `/sardinha` | Inicializador — lê `sardinha_agent.md`, ativa contexto |
| `sardinha-posso-comprar` | `/sardinha-posso-comprar` | Validar compra: SIM/NÃO/TALVEZ com base no saldo da categoria |
| `sardinha-raio-x` | `/sardinha-raio-x` | Análise de risco: schedules dos próximos 6 meses, parecer VERDE/AMARELO/VERMELHO |
| `sardinha-como-estamos` | `/sardinha-como-estamos` | Snapshot do mês: % real vs. meta por categoria |
| `sardinha-fechar-mes` | `/sardinha-fechar-mes` | Fechamento mensal: sobras → Liberdade Financeira, déficits → aprendizado |
| `sardinha-cartoes` | `/sardinha-cartoes` | Gestão de cartões, fechamentos e parcelamentos |
| `sardinha-orcamento` | `/sardinha-orcamento` | Alocar renda, zerar o "Para Orçar" |

Instalação dos skills de cliente (`client/skills/`; as skills internas do repo ficam em `.agents/skills/`):
```bash
npx skills add legolas-pro/budget_stack --skill-path client/skills/sardinha
npx skills add legolas-pro/budget_stack --skill-path client/skills/sardinha-posso-comprar
npx skills add legolas-pro/budget_stack --skill-path client/skills/sardinha-raio-x
npx skills add legolas-pro/budget_stack --skill-path client/skills/sardinha-como-estamos
npx skills add legolas-pro/budget_stack --skill-path client/skills/sardinha-fechar-mes
npx skills add legolas-pro/budget_stack --skill-path client/skills/sardinha-cartoes
npx skills add legolas-pro/budget_stack --skill-path client/skills/sardinha-orcamento
```

---

## MCPs — Conexão

```bash
claude mcp add --scope local --transport sse actual-mcp http://localhost:3001/sse
claude mcp add --scope local --transport sse pluggy-mcp http://localhost:3002/sse
```

**actual-mcp:** catálogo de tools descoberto em runtime via `tools/list`. Escrita possível — aplicar dupla confirmação para operações críticas (transações, contas, orçamentos).

**pluggy-mcp:** tools de leitura (`listConnectors`, `getAccounts`, `getTransactions`). Código em `pluggy-openapis3-mcp-build/src/src/index.ts`.

---

## Protocolo de uso dos MCPs

- Valores monetários: inteiros em centavos. `-5000` = -R$50,00. Despesas negativas, receitas positivas.
- Datas: sempre `YYYY-MM-DD`.
- Tools de escrita crítica (transações, contas, orçamentos): confirmar 2 vezes antes de executar.
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
