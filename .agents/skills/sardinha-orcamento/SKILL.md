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

Todo real que entra precisa de um nome antes de ser gasto.

## 1 — Buscar estado atual do orçamento (UMA chamada)

```bash
curl -s --ipv4 -H "x-api-key: $ACTUAL_API_KEY" \
  "http://127.0.0.1:5007/v1/budgets/$ACTUAL_BUDGET_SYNC_ID/months/$(date +%Y-%m)" \
| jq -r '
  .data |
  "TBB:\(.toBudget//0) | Renda:\(.totalIncome) | TotalOrçado:\(.totalBudgeted)\n---",
  (.categoryGroups[] |
    "[\(.name)] orç_grupo=\(.budgeted)",
    (.categories[] | select(.hidden==false) |
      "  \(.name): orç=\(.budgeted) saldo=\(.balance)"
    )
  )
'
```

> Todos os valores em **centavos** — divida por 100 para exibir em R$.

## 2 — Avaliar o TBB

- **TBB = 0**: orçamento equilibrado. Confirme ao usuário e encerre.
- **TBB negativo**: alerta máximo — mais orçado do que há disponível. Vá para o protocolo de correção abaixo.
- **TBB positivo**: há dinheiro sem destino. Siga para o passo 3.

Se `Renda = 0` (renda ainda não registrada no mês), pergunte o valor ao usuário antes de continuar.

## 3 — Propor alocação por prioridade

*"Tem R$[TBB/100] esperando destino. Vamos alocar antes que suma sem perceber?"*

| Prioridade | Destino | Critério |
|---|---|---|
| 1ª | Necessidades | Completar até 40% da renda |
| 2ª | Liberdade Financeira | Completar até 25% — Quest principal |
| 3ª | Metas | Parcela mensal do objetivo do ano |
| 4ª | Conhecimento | Completar até 5% |
| 5ª | Conforto | Completar até 20% |
| 6ª | Prazeres | Completar até 5% — nunca zerar |

Instrua o usuário a realizar cada alocação manualmente no Actual Budget.

## 4 — Confirmação final

Peça ao usuário para verificar se o Para Orçar chegou a zero no Actual.

---

## Protocolo: Correção de TBB Negativo

1. Identifique quais grupos/categorias estão orçando mais do que têm cobertura.
2. Apresente o déficit por categoria em ordem decrescente de valor.
3. Ajuste mais simples: reduzir o orçado em Prazeres ou Conforto primeiro.
4. Instrua o ajuste manual no Actual.
5. Repita até TBB = 0.

## Regras de comunicação

- Nunca encerre uma sessão de orçamento com TBB ≠ 0 sem propor o caminho.
- Sempre que Liberdade Financeira receber aporte, comemore discretamente.
- Metáfora dos envelopes para usuários com dificuldade: *"Cada categoria é um envelope físico. Se não tem envelope com o nome, o dinheiro vai para o envelope 'sumiço'."*
