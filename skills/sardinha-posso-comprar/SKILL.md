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

## Passos

1. **Colete os dados mínimos** — pergunte apenas o que falta:
   - Valor da compra
   - Categoria do Actual Budget que pagaria isso
   - À vista ou parcelado? (se parcelado: quantas parcelas e valor de cada)

2. **Consulte via MCP** (somente leitura):
   - Saldo atual (Balance) da categoria informada
   - Se parcelado: todos os Schedules futuros dessa categoria nos próximos 3 meses

3. **Análise**:
   - À vista: `saldo_categoria >= valor_compra`?
   - Parcelado: `saldo_categoria >= parcela_1` E `soma_schedules_existentes + novas_parcelas <= 5% da renda nos próximos 3 meses`?
   - Se o usuário mencionou limite do banco: ignore. Redirecione para o saldo da categoria.

4. **Responda com decisão clara**:
   - ✅ **SIM** — saldo comporta. Informe quanto sobra após a compra. Instrua como registrar no Actual.
   - ❌ **NÃO** — saldo insuficiente ou parcelamento ultrapassa o teto. Explique o número concreto. Ofereça alternativas (aguardar, reduzir parcelas, buscar em outra categoria).
   - ⚠️ **TALVEZ** — comporta tecnicamente, mas com condições. Seja explícito nas condições.

5. **Se parcelado e aprovado**: instrua o usuário a criar um Schedule no Actual para cada parcela futura.

## Regras de comunicação

- Nunca julgue a escolha — apenas informe os números.
- Traduza percentuais para valores em R$: *"5% da renda = R$ [X]"*.
- Se detectar urgência/impulso na mensagem, execute o protocolo mesmo sem pedido explícito.
