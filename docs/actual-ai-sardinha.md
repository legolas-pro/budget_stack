# Actual AI + Sardinha

## Objetivo

Este ajuste deixa o `actual_ai` mais próximo do comportamento do copiloto Sardinha, mas sem mudar a natureza do serviço.

Na prática, o `actual_ai` continua sendo um classificador automático de transações. Ele **não** vira um agente conversacional completo, nem substitui um copiloto read-only em cima do MCP.

## O que foi alinhado

- `dryRun` continua ativo por padrão.
- `freeWebSearch` foi habilitado por padrão para ajudar em comerciantes ambíguos.
- O prompt de classificação foi reescrito em português com postura conservadora.
- As tags padrão foram alinhadas para revisão humana:
  - `#sardinha-ai`
  - `#sardinha-revisar`

## O que o prompt Sardinha faz bem

- Preferir consistência de classificação.
- Evitar chute quando houver ambiguidade.
- Reduzir erro entre categorias próximas.
- Tratar casos mais confusos com revisão humana.
- Reforçar que a IA deve escolher apenas categorias existentes.

## O que continua fora do escopo do `actual_ai`

- Responder perguntas como "Posso comprar?" ou "Como estamos?"
- Ler o orçamento inteiro e calcular metas percentuais da casa.
- Interpretar estado emocional do usuário.
- Aplicar dupla confirmação para decisões de escrita.
- Operar como copiloto financeiro conversacional.

## Configuração aplicada

A configuração principal está em [docker-compose.yaml](../docker-compose.yaml) no serviço `actual_ai`.

Pontos principais:

- `FEATURES`:
  - `dryRun`
  - `classifyOnStartup`
  - `syncAccountsBeforeClassify`
  - `rerunMissedTransactions`
  - `freeWebSearch`
- `PROMPT_TEMPLATE`: embutido no compose para manter o comportamento versionado.
- Tags padrão:
  - `ACTUAL_AI_GUESSED_TAG=#sardinha-ai`
  - `ACTUAL_AI_NOT_GUESSED_TAG=#sardinha-revisar`

## Próximo passo recomendado

Se a meta for chegar perto do Sardinha real, o caminho é manter dois papéis separados:

1. `actual_ai` para classificação assistida e conservadora.
2. Um agente read-only separado, em cima do `actual_mcp`, para análise, protocolo e conversa.
