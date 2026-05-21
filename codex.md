# Budget Stack — Contexto para Codex

## Copiloto Sardinha — Skills Framework

O agente conversacional deste projeto é o Copiloto Sardinha. Ele opera em modo somente leitura sobre o Actual Budget via MCP e implementa o Método Sardinha de orçamento base zero.

**Sempre carregue `$sardinha` primeiro** em qualquer sessão financeira. Ele inicializa a persona completa e lista os sub-skills disponíveis.

| Comando | Função |
|---|---|
| `$sardinha` | Inicializador obrigatório |
| `$sardinha-posso-comprar` | Validar compra antes de gastar |
| `$sardinha-raio-x` | Análise de risco dos próximos 6 meses |
| `$sardinha-como-estamos` | Snapshot do mês: % real vs. meta |
| `$sardinha-fechar-mes` | Fechamento mensal e realocação de sobras |
| `$sardinha-cartoes` | Gestão de cartões e parcelamentos |
| `$sardinha-orcamento` | Alocar renda e zerar o "Para Orçar" |

A persona completa está em `sardinha_agent.md` na raiz do repositório. Os skills estão em `skills/`.

Os MCPs necessários para os skills de análise:
```bash
CODEX_HOME="$PWD/.codex" codex mcp add actual-mcp --url http://localhost:3001/sse
CODEX_HOME="$PWD/.codex" codex mcp add pluggy-mcp --url http://localhost:3002/sse
```

---

## Entendimentos Técnicos — 2026-05-20

- O controle efetivo das variáveis de ambiente desta stack é feito via Portainer.
- O conteúdo de `actual.env.example` não é a fonte de verdade do ambiente já implantado.
- O serviço `actual_ai` usado nesta stack é a imagem `sakowicz/actual-ai`.
- No upstream investigado nesta sessão, o `actual_ai` classifica transações existentes atualizando `category` e `notes`.
- No upstream investigado nesta sessão, o fluxo normal de classificação não cria transações novas.
- No upstream investigado nesta sessão, a ação que pode introduzir novas transações no contexto da classificação é o bank sync acionado por `syncAccountsBeforeClassify`.
- A duplicação relatada nesta sessão ficou associada à presença de `syncAccountsBeforeClassify` no ambiente efetivo do `actual_ai`.
- O valor efetivo observado no serviço implantado para `FEATURES` foi `["classifyOnStartup","syncAccountsBeforeClassify","rerunMissedTransactions","freeWebSearch"]`.
- O ambiente efetivo observado no serviço implantado não estava em `dryRun`.
- O serviço `actual-budget_actual_ai` foi observado como `0/1` nesta sessão.
- O serviço `actual-budget_actual_ai` foi observado usando cron de classificação `*/10 * * * *` nesta sessão.
- O provider observado no serviço implantado nesta sessão foi `openrouter`.
- O modelo observado no serviço implantado nesta sessão foi `anthropic/claude-3-haiku`.
- O repositório continha defaults e documentação mencionando `syncAccountsBeforeClassify` no conjunto padrão do `actual_ai` no momento desta investigação.
