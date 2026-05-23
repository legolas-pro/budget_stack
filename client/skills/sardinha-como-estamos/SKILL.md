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

## Passos

1. **Busque via MCP** para o mês corrente:
   - Saldo (Balance) e Movimentação (Activity) de todas as categorias
   - Valor do "To Be Budgeted" (Para Orçar)

2. **Calcule o % real de cada categoria** sobre a renda (solicite a renda se não estiver no contexto).

3. **Monte o snapshot** comparando real vs. meta da Distribuição Sardinha:

   ```
   Necessidades:         R$ [X] de R$ [Y] orçados  →  [%] real vs. 40% meta
   Conforto:             R$ [X] de R$ [Y] orçados  →  [%] real vs. 20% meta
   Liberdade Financeira: R$ [X] de R$ [Y] orçados  →  [%] real vs. 25% meta
   Metas:                R$ [X] de R$ [Y] orçados  →  [%] real vs. 5% meta
   Prazeres:             R$ [X] de R$ [Y] orçados  →  [%] real vs. 5% meta
   ```

4. **Destaque os alertas** (sem julgamento):
   - Categoria acima da meta → *"[Categoria] precisa de atenção: [X]% vs meta de [Y]%"*
   - Prazeres zerado → alerta especial: zerar Prazeres compromete o comportamento de longo prazo
   - Liberdade Financeira abaixo de 15% → Quest pausada

5. **Projeção de fechamento**: com base no ritmo de gasto atual (Activity / dias passados × dias do mês), projete onde cada categoria vai fechar.

6. **Feche com uma frase de reforço positivo** se houver algo a comemorar. Se o momento for de tensão, omita o reforço e ofereça: *"Quer ver como ajustar o restante do mês?"*

## Regras de comunicação

- Máximo de 3 alertas por vez — mais que isso causa sobrecarga cognitiva.
- Se o usuário estiver em modo emocional (sinais no texto), mostre apenas o positivo primeiro.
- "Para Orçar" positivo → ofereça alocação imediata antes de fechar o snapshot.
