---
name: sardinha-fechar-mes
description: >
  Protocolo Sardinha de fechamento mensal. Use quando o usuário disser "fechar o mês",
  "fechamento de [mês]", "quero ver como fechou o mês", ou no final de cada mês para
  consolidar o orçamento. Requer /sardinha carregado na sessão.
category: finance
---

# Protocolo: Fechar o Mês

> Assume que `/sardinha` está carregado e a persona está ativa.

## 1 — Buscar dados do mês que fechou (UMA chamada)

Substitua `YYYY-MM` pelo mês sendo fechado (ex: `2026-04` para abril):

```bash
MES="YYYY-MM"
curl -s --ipv4 -H "x-api-key: $ACTUAL_API_KEY" \
  "http://127.0.0.1:5007/v1/budgets/$ACTUAL_BUDGET_SYNC_ID/months/$MES" \
| jq -r '
  .data |
  "Renda:\(.totalIncome) | Gasto:\(.totalSpent) | Saldo:\(.totalBalance)\n---",
  (.categoryGroups[] |
    "[\(.name)]",
    (.categories[] | select(.hidden==false) |
      "  \(.name): orç=\(.budgeted) gasto=\(.spent) saldo=\(.balance)"
    )
  )
'
```

> Todos os valores em **centavos** — divida por 100 para exibir em R$.

Se o usuário não informar o mês, use o mês anterior: substitua `$MES` por `$(date -d "last month" +%Y-%m)` (Linux) ou `$(date -v-1m +%Y-%m)` (macOS).

## 2 — Separar sobras e déficits

- **Sobras**: categorias com `saldo > 0`
- **Déficits**: categorias com `saldo < 0` ou `gasto > orçado`

## 3 — Para as sobras — sugerir realocação

Prioridade de realocação:
1. Completar Liberdade Financeira até 25% da renda, se não atingida
2. Reforçar Metas do ano
3. Reserva na mesma categoria para o próximo mês

Instrua o usuário a fazer a transferência manualmente no Actual.

## 4 — Para os déficits — registrar o aprendizado

*"[Categoria] estourou R$X. O que aconteceu: [causa]. Ajuste sugerido para o próximo mês: [ação]."*

Nunca atribua culpa — categorias estouraram porque o orçamento estava aprendendo.

## 5 — Resumo verbal do mês

```
Fechamento de [Mês/Ano]:
→ Necessidades:         Z% (meta: 40%)   [✅ / ⚠️]
→ Conforto:             Z% (meta: 20%)   [✅ / ⚠️]
→ Liberdade Financeira: Z% (meta: 25%)   [✅ / ⚠️]
→ Metas:                Z% (meta: 5%)    [✅ / ⚠️]
→ Prazeres:             Z% (meta: 5%)    [✅ / ⚠️]
→ Saldo do mês:         R$X              [↑ positivo / ↓ negativo]
```

## 6 — Comemore se houver marco

Primeiro mês dentro das metas, Liberdade Financeira mantida em mês apertado, etc. Seja genuíno — não force se o mês foi difícil.

## Regras de comunicação

- Erros do mês são dados históricos, não falhas morais.
- Se o saldo do mês foi positivo, mostre antes dos déficits.
- O fechamento é retrospectivo — use para gerar aprendizado, não ansiedade.
