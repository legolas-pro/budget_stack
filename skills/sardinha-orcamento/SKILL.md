---
name: sardinha-orcamento
description: >
  Protocolo Sardinha de orçamento base zero. Use quando o usuário quiser alocar a renda do mês,
  o "To Be Budgeted" (Para Orçar) estiver positivo, o usuário receber pagamento e quiser distribuir,
  ou quiser configurar o orçamento do mês seguinte. Requer /sardinha carregado na sessão.
category: finance
---

# Protocolo: Orçamento Base Zero

> Assume que `/sardinha` está carregado e a persona está ativa.

## Princípio

Renda do Mês − Categorias Alocadas = R$ 0,00

Todo real que entra precisa de um nome antes de ser gasto. O "Para Orçar" positivo é dinheiro
à espera de destino — deixá-lo sem categoria é o caminho mais curto para ele desaparecer.

---

## Passos

1. **Consulte via MCP** o valor atual do "To Be Budgeted" (Para Orçar).

2. **Se zero ou negativo**:
   - Zero → sessão encerrada, orçamento equilibrado. Confirme ao usuário.
   - Negativo → **alerta máximo**: a família orçou mais do que tem. Vá para o passo de correção abaixo.

3. **Se positivo** (dinheiro sem destino):
   - Informe o valor: *"Tem R$ [X] esperando destino. Vamos alocar antes que suma sem perceber?"*
   - Consulte via MCP o saldo atual de cada categoria da Distribuição Sardinha.
   - Sugira alocação na ordem de prioridade:

   | Prioridade | Categoria | Critério de alocação |
   |---|---|---|
   | 1ª | Necessidades | Completar até o orçado (não ultrapassar 40% da renda) |
   | 2ª | Liberdade Financeira | Completar até 25% da renda — Quest principal |
   | 3ª | Metas | Aportar parcela mensal do objetivo do ano |
   | 4ª | Conhecimento | Completar até 5% se não atingido |
   | 5ª | Conforto | Completar até 20% da renda |
   | 6ª | Prazeres | Completar até 5% — nunca zerar |

   Instrua o usuário a realizar cada alocação manualmente no Actual Budget.

4. **Confirmação final**: após alocações, peça ao usuário para verificar se o Para Orçar chegou a zero.

---

## Protocolo: Correção de "Para Orçar" Negativo

1. Identifique via MCP qual(is) categoria(s) estão com valor orçado (Budgeted) acima do que foi aportado.
2. Apresente o déficit por categoria em ordem decrescente.
3. Sugira o ajuste mais simples: reduzir o orçado na categoria menos crítica (Prazeres ou Conforto primeiro).
4. Instrua o ajuste manual no Actual.
5. Repita até o Para Orçar = R$ 0,00.

---

## Regras de comunicação

- Jamais deixe uma sessão de orçamento com Para Orçar ≠ 0 sem pelo menos propor o caminho.
- Use a metáfora dos envelopes para usuários com dificuldade: *"Cada categoria é um envelope físico. Se não tem envelope com o nome, o dinheiro vai para o envelope 'sumiço'."*
- Sempre que Liberdade Financeira receber aporte, comemore discretamente.
