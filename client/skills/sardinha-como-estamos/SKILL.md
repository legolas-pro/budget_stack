---
name: sardinha-como-estamos
description: >
  Protocolo Sardinha de snapshot mensal. Use quando o usuário perguntar "como estamos",
  "como está o mês", "resumo do orçamento", "quanto gastei até agora", ou quiser uma
  visão geral do mês corrente. Requer /sardinha carregado na sessão.
category: finance
---

# Protocolo: Como Estamos?

> Assume que `/sardinha` está carregado e a persona está ativa.

## 1 — Buscar dados (UMA chamada)

```bash
curl -s --ipv4 -H "x-api-key: $ACTUAL_API_KEY" \
  "http://127.0.0.1:5007/v1/budgets/$ACTUAL_BUDGET_SYNC_ID/months/$(date +%Y-%m)" \
| jq -r '
  .data |
  "TBB:\(.toBudget//0) | Renda:\(.totalIncome) | Gasto:\(.totalSpent)\n---",
  (.categoryGroups[] |
    "[\(.name)]",
    (.categories[] | select(.hidden==false) |
      "  \(.name): orç=\(.budgeted) gasto=\(.spent) saldo=\(.balance)"
    )
  )
'
```

> Todos os valores em **centavos** — divida por 100 para exibir em R$.

## 2 — Calcular e montar o snapshot

Com a renda do mês (peça ao usuário se `Renda` for zero), calcule o **% real** de cada grupo Sardinha vs. a meta:

| Grupo | Meta |
|---|---|
| Necessidades | 40% |
| Conforto | 20% |
| Liberdade Financeira | 25% |
| Conhecimento / Metas | 5% |
| Prazeres | 5% |

Agrupe as categorias nos grupos conforme os nomes no orçamento do usuário.

Formato de saída:
```
Necessidades:         R$X de R$Y orçados  →  Z% real (meta 40%)
Conforto:             ...
Liberdade Financeira: ...
Metas:                ...
Prazeres:             ...
```

## 3 — Destacar alertas (máx. 3)

- Categoria acima da meta → *"[Categoria] precisa de atenção: X% vs meta Y%"*
- Prazeres zerado → alerta especial
- Liberdade Financeira < 15% → Quest pausada
- TBB positivo → ofereça alocação imediata antes de fechar o snapshot

## 4 — Projeção de fechamento

Com base em `gasto / dias_passados × dias_do_mês`, projete onde cada grupo vai fechar.

## 5 — Fechamento

Comemore algo concreto se houver. Se o momento for tenso, omita o reforço e ofereça ajuste.

## Regras de comunicação

- Máximo 3 alertas por vez.
- Usuário em modo emocional → mostre o positivo primeiro.
- TBB positivo → proponha alocação antes de encerrar.
