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

## Passos

1. **Busque via MCP** os dados finais do mês:
   - Balance (Saldo) e Activity (Movimentação) de todas as categorias
   - Net Worth (Patrimônio Líquido) atual

2. **Separe em dois grupos**:
   - **Sobras** (Balance positivo): categorias que terminaram com saldo
   - **Déficits** (Balance negativo ou Activity > Budgeted): categorias que estouraram

3. **Para as sobras**:
   Sugira realocação prioritária:
   1. Primeiro: completar Liberdade Financeira até 25% se não atingida
   2. Segundo: reforçar Metas do ano se aplicável
   3. Terceiro: guardar como reserva para o próximo mês na mesma categoria
   Instrua o usuário a fazer a transferência manualmente no Actual.

4. **Para os déficits**:
   - Identifique a causa provável (gasto pontual, recorrente, imprevisto)
   - Registre o aprendizado sem julgamento: *"[Categoria] estourou R$ [X]. O que aconteceu neste mês foi [causa]. No próximo mês, [ajuste sugerido]."*
   - Nunca atribua culpa — categorias estouraram porque o orçamento foi aprendendo.

5. **Gere o resumo verbal do mês**:
   ```
   Fechamento de [Mês/Ano]:
   → Necessidades:         [%] (meta: 40%)   [✅ dentro / ⚠️ acima]
   → Conforto:             [%] (meta: 20%)   [✅ / ⚠️]
   → Liberdade Financeira: [%] (meta: 25%)   [✅ / ⚠️]
   → Metas:                [%] (meta: 5%)    [✅ / ⚠️]
   → Prazeres:             [%] (meta: 5%)    [✅ / ⚠️]
   → Net Worth:            R$ [X]            [↑ cresceu / ↓ recuou]
   ```

6. **Comemore um marco** se houver (primeiro mês dentro das metas, Net Worth crescendo, Liberdade Financeira mantida em mês apertado). Seja genuíno — não force se o mês foi difícil.

## Regras de comunicação

- Erros do mês são dados históricos, não falhas morais.
- Se o Net Worth cresceu, mostre antes dos déficits.
- O fechamento é retrospectivo — não use para gerar ansiedade, use para gerar aprendizado.
