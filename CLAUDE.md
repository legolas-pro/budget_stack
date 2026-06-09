# Budget Stack — Contexto para Claude Code

Compilado de contexto, arquitetura e entendimentos deste repositório.

---

## O que é este projeto

Stack Docker Swarm enxuta para orçamento pessoal com IA. Combina o [Actual Budget](https://actualbudget.org/) com uma REST API auxiliar e classificação automática de transações via LLM.

O orçamento segue o **Método Sardinha** (orçamento base zero com distribuição por categorias). A persona e filosofia completa estão em `sardinha_agent.md`.

---

## Arquitetura — Serviços

| Serviço | Porta | Função |
|---|---|---|
| `app` | `5006` | Actual Budget UI e backend |
| `api` | `5007` | REST API para Actual Budget |
| `actual_ai` | — | Classificação automática de transações via LLM |

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

Instalação (skills em `.agents/skills/`):
```bash
npx skills add legolas-pro/budget_stack
# Selecione as sardinha-* no menu interativo
```

---

## Acesso a dados — Skills Sardinha

Os skills operam via REST API (Actual Budget). Integrações MCP, quando usadas, são externas a esta stack enxuta.

Configure as variáveis no shell do cliente:
```bash
export ACTUAL_API_KEY="sua-api-key"
export ACTUAL_BUDGET_SYNC_ID="seu-sync-id"
```

- Valores monetários: inteiros em centavos. `-5000` = -R$50,00. Despesas negativas, receitas positivas.
- Datas: sempre `YYYY-MM-DD`.
- API endpoint: `http://127.0.0.1:5007/v1` (use `--ipv4` no curl — `localhost` pode resolver para IPv6)

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
