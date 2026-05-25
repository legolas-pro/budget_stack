---
name: sardinha-cartoes
description: >
  Protocolo Sardinha de gestão de cartões de crédito. Use quando o usuário mencionar
  cartão de crédito, fatura, data de fechamento, parcelamento em cartão, limite do cartão,
  querer entender o impacto de uma compra no cartão, ou qualquer dúvida sobre como o Actual
  Budget trata cartões. Requer /sardinha carregado na sessão. Skill evolutivo — cresce conforme
  as particularidades do Actual Budget com cartões forem mapeadas.
category: finance
---

# Protocolo: Cartões de Crédito

> Assume que `/sardinha` está carregado e a persona está ativa.

## Filosofia Central

O cartão de crédito é um **caminhão de transporte**: ele move dinheiro, não cria dinheiro.
Se o armazém (a categoria no Actual) está vazio, o caminhão não sai — independente do limite
que o banco exibe. O único número que importa é o saldo da categoria.

Sempre que o usuário citar limite do banco para justificar uma compra:
> *"Esquece o limite do banco por um segundo. Qual é o saldo da categoria no Actual?"*

---

## Protocolo: Compra em Cartão

**Passo 1 — Pergunte o dia de fechamento do cartão** se não estiver no contexto:
- Fechamento em ≤ 5 dias: a compra impacta **este mês**
- Fechamento em > 5 dias: impacta o **próximo mês**

**Passo 2 — Identifique a categoria** que pagará esta compra.

**Passo 3 — Buscar saldo da categoria:**
```bash
curl -s --ipv4 -H "x-api-key: $ACTUAL_API_KEY" \
  "http://127.0.0.1:5007/v1/budgets/$ACTUAL_BUDGET_SYNC_ID/months/$(date +%Y-%m)" \
| jq -r '.data.categoryGroups[].categories[] | select(.hidden==false) | "\(.name): saldo=\(.balance)"'
```

> Valores em **centavos**.

**Passo 4 — Decidir e orientar** (igual ao protocolo Posso Comprar?).

---

## Protocolo: Compra Parcelada em Cartão

**Passo 1** — Colete: valor total, número de parcelas, valor de cada parcela, cartão.

**Passo 2 — Buscar agendamentos futuros da categoria (próximos 3 meses):**
```bash
docker exec $(docker ps -q -f name=actual-budget_actual_bi_postgres) \
  psql -U actual_bi -d actual_bi -tA \
  -c "SELECT to_char(next_date,'YYYY-MM-DD'), name, amount FROM actual_active_schedules WHERE next_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 months' ORDER BY next_date" 2>/dev/null
```

Identifique os agendamentos da categoria em questão pelo nome.

**Passo 3** — Verifique: `parcelas_existentes + novas_parcelas ≤ 5% da renda mensal`?

**Passo 4 — Se aprovado:** instrua o usuário a criar um **Schedule** no Actual para cada parcela futura:
- Name: `[Produto] — parcela X/Y`
- Account: o cartão usado
- Category: a categoria correta
- Date: data prevista de fechamento de cada fatura

**Passo 5 — Se bloqueado:** explique o número concreto do comprometimento. Ofereça alternativas (menos parcelas, aguardar, outra categoria).

---

## Estado Atual — Pontos de Evolução

> Esta seção documenta comportamentos conhecidos do Actual Budget com cartões.

- O Actual Budget tem lógica própria para transações de cartão (payment accounts vs. budget accounts).
- Compras em cartão no Actual podem gerar uma "To Pay" entry — verificar se está sendo gerada corretamente.
- Fatura paga ≠ categoria orçada: o usuário pode confundir o pagamento da fatura com o gasto registrado.
- **Evolução futura**: mapear o fluxo exato de pagamento de fatura no Actual e adicionar protocolo aqui.

---

## Regras de comunicação

- Nunca use o limite do banco como referência de capacidade financeira.
- Parcelamento não é "dividir o impacto" — é antecipar renda futura. Deixe isso claro.
- Data de fechamento é crítica — pergunte sempre antes de orientar sobre compra em cartão.
- Traduza centavos para R$ em toda resposta ao usuário.
