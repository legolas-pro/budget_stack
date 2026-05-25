---
name: sardinha-raio-x
description: >
  Protocolo Sardinha de análise de risco financeiro completa. Use quando o usuário pedir
  "raio-x", "análise de risco", "quanto estou comprometido nos próximos meses", ou quiser
  ver o peso dos agendamentos futuros sobre a renda. Requer /sardinha carregado na sessão.
category: finance
---

# Protocolo: Raio-X Financeiro

> Assume que `/sardinha` está carregado e a persona está ativa.

## 1 — Buscar agendamentos dos próximos 6 meses (Postgres)

```bash
docker exec $(docker ps -q -f name=actual-budget_actual_bi_postgres) \
  psql -U actual_bi -d actual_bi -tA \
  -c "SELECT to_char(next_date,'YYYY-MM'), name, amount FROM actual_active_schedules WHERE next_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '6 months' ORDER BY next_date" 2>/dev/null
```

> Valores em **centavos** — divida por 100 para exibir em R$.
> Agendamentos negativos = despesas. Positivos = receitas.

## 2 — Buscar estado atual do mês (API)

```bash
curl -s --ipv4 -H "x-api-key: $ACTUAL_API_KEY" \
  "http://127.0.0.1:5007/v1/budgets/$ACTUAL_BUDGET_SYNC_ID/months/$(date +%Y-%m)" \
| jq -r '"Renda:\(.data.totalIncome) | TBB:\(.data.toBudget//0)"'
```

## 3 — Solicitar renda média mensal

Se `Renda = 0` ou o usuário preferir usar uma referência fixa, pergunte a renda líquida mensal.

## 4 — Agrupar agendamentos por mês e por categoria Sardinha

Para cada um dos 6 meses seguintes:
- Some os agendamentos por grupo Sardinha (inferindo pelo nome da categoria no agendamento)
- Calcule `comprometimento_mês / renda × 100`

## 5 — Verificar teto crítico

`Necessidades + Conforto ≤ 60% da renda`?

## 6 — Emitir o parecer

| Cor | Condição |
|---|---|
| 🟢 VERDE | Todos os tetos respeitados. Liberdade Financeira ≥ 15%. |
| 🟡 AMARELO | Algum teto próximo do limite, ou Liberdade Financeira entre 10–15%. |
| 🔴 VERMELHO | Necessidades + Conforto > 60%, ou Liberdade Financeira < 10%, ou TBB negativo. |

## 7 — Destacar o "Boss do Mês"

Para cada mês dos 6 analisados, destaque o mês com maior pico de comprometimento.

## 8 — Sugerir UM ajuste concreto

Se AMARELO ou VERMELHO, sugira no máximo 1 ação. Nunca liste mais de 3 ações simultâneas.

## Regras de comunicação

- Apresente os números por mês, não só o total — o impacto temporal é o que importa.
- Transforme todo percentual em R$: *"40% da renda = R$X/mês"*.
- VERMELHO = urgente, mas sem pânico.
