---
name: sardinha-posso-comprar
description: >
  Protocolo Sardinha de decisão de compra. Use quando o usuário perguntar "posso comprar X",
  quiser validar um gasto antes de fazer, mencionar um produto ou serviço que quer adquirir,
  ou pedir aprovação para qualquer despesa. Requer /sardinha carregado na sessão. Se não estiver,
  carregue /sardinha primeiro e depois execute este protocolo.
category: finance
---

# Protocolo: Posso Comprar?

> Assume que `/sardinha` está carregado e a persona está ativa.

## 1 — Coletar dados mínimos

Pergunte apenas o que falta:
- Valor da compra
- Categoria do Actual Budget que pagaria isso
- À vista ou parcelado? (se parcelado: quantas parcelas, valor de cada)

## 2 — Buscar balance da categoria e agendamentos futuros (DUAS chamadas em paralelo)

**Chamada A — balance da categoria:**
```bash
curl -s --ipv4 -H "x-api-key: $ACTUAL_API_KEY" \
  "http://127.0.0.1:5007/v1/budgets/$ACTUAL_BUDGET_SYNC_ID/months/$(date +%Y-%m)" \
| jq -r '.data.categoryGroups[].categories[] | select(.hidden==false) | "\(.name): orç=\(.budgeted) gasto=\(.spent) saldo=\(.balance)"'
```

Localize a categoria informada pelo usuário na lista. Saldo em **centavos**.

**Chamada B — agendamentos dos próximos 3 meses (apenas se compra parcelada):**
```bash
docker exec $(docker ps -q -f name=actual-budget_actual_bi_postgres) \
  psql -U actual_bi -d actual_bi -tA \
  -c "SELECT to_char(next_date,'YYYY-MM-DD'), name, amount FROM actual_active_schedules WHERE next_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 months' ORDER BY next_date" 2>/dev/null
```

Identifique os agendamentos que provavelmente pertencem à categoria discutida pelo nome.

## 3 — Análise

**À vista:**
`saldo_categoria >= valor_compra` (em centavos)?

**Parcelado:**
- `saldo_categoria >= valor_parcela_1` (centavos)?
- `soma_agendamentos_existentes_na_categoria + novas_parcelas_mensais <= 5% da renda mensal`?

Se o usuário citar limite do banco: ignore. Redirecione para o saldo da categoria.

## 4 — Decisão clara

- ✅ **SIM** — saldo comporta. Informe quanto sobra após a compra (em R$). Instrua como registrar no Actual.
- ❌ **NÃO** — explique o número concreto do bloqueio. Ofereça alternativas (aguardar, reduzir parcelas, buscar em outra categoria).
- ⚠️ **TALVEZ** — comporta tecnicamente, mas com condições. Seja explícito nas condições.

## 5 — Se parcelado e aprovado

Instrua o usuário a criar um **Schedule** no Actual para cada parcela futura:
- Name: `[Produto] — parcela X/Y`
- Account: o cartão/conta usado
- Category: a categoria correta
- Date: data prevista de cada vencimento

## Regras de comunicação

- Nunca julgue a escolha — apenas informe os números.
- Traduza centavos para R$ em toda resposta ao usuário.
- Se detectar urgência/impulso na mensagem, execute o protocolo mesmo sem pedido explícito.
