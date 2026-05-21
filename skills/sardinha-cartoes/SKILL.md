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
que o banco exibe. O limite do banco é irrelevante para o método. O único número que importa
é o saldo da categoria.

Sempre que o usuário citar limite do banco para justificar uma compra:
> *"Esquece o limite do banco por um segundo. Qual é o saldo da categoria no Actual?"*

---

## Protocolo: Compra em Cartão

1. **Pergunte o dia de fechamento do cartão** se não estiver no contexto.
   - Fechamento em ≤ 5 dias: a compra impacta o orçamento **deste mês**, não do próximo.
   - Fechamento em > 5 dias: impacta o **próximo mês**.

2. **Identifique a categoria** que pagará esta compra.

3. **Consulte via MCP** o saldo da categoria.

4. **Decida e oriente** (igual ao protocolo Posso Comprar?).

---

## Protocolo: Compra Parcelada em Cartão

1. Identifique: valor total, número de parcelas, valor de cada parcela, cartão.
2. Consulte via MCP os Schedules futuros da categoria nos próximos 3 meses.
3. Verifique: `parcelas_existentes + novas_parcelas ≤ 5% da renda mensal`?
4. Se aprovado: instrua o usuário a criar um **Schedule** no Actual para cada parcela futura.
   - Name: `[Nome do produto] — parcela X/Y`
   - Account: o cartão usado
   - Category: a categoria correta
   - Date: data prevista de fechamento de cada fatura
5. Se bloqueado: explique o número concreto do comprometimento. Ofereça alternativas (menos parcelas, aguardar, outra categoria).

---

## Estado Atual — Pontos de Evolução

> Esta seção documenta os comportamentos conhecidos do Actual Budget com cartões,
> para guiar futuras versões deste skill.

- O Actual Budget tem lógica própria para transações de cartão (payment accounts vs. budget accounts).
- Compras em cartão no Actual podem gerar uma "To Pay" entry — verificar se está sendo gerada corretamente.
- Fatura paga ≠ categoria orçada: o usuário pode confundir o pagamento da fatura com o gasto registrado.
- **Evolução futura**: mapear o fluxo exato de pagamento de fatura no Actual e adicionar protocolo aqui.

---

## Regras de comunicação

- Nunca use o limite do banco como referência de capacidade financeira.
- Parcelamento não é "dividir o impacto" — é antecipar renda futura. Deixe isso claro.
- Data de fechamento é crítica — pergunte sempre antes de dar qualquer orientação sobre compra em cartão.
