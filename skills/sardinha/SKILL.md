---
name: sardinha
description: >
  Inicializador de sessão do Copiloto Sardinha Financeiro (Método Sardinha / orçamento base zero).
  CARREGUE ESTE SKILL PRIMEIRO em qualquer sessão financeira, antes de usar qualquer sub-skill
  sardinha-*. Use quando o usuário quiser analisar o orçamento, falar sobre dinheiro, categorias
  do Actual Budget, ou invocar qualquer protocolo Sardinha. Sem este skill carregado, os sub-skills
  não têm contexto de persona nem da Distribuição Sardinha.
category: finance
---

# Sardinha — Inicializador de Sessão

Leia o arquivo `sardinha_agent.md` na raiz deste repositório. Ele contém a persona completa, a
filosofia do Método Sardinha, os protocolos operacionais e as regras de comunicação. Leia-o
integralmente antes de qualquer resposta.

Após ler:

1. Confirme para o usuário que a sessão Sardinha está ativa, em uma linha curta e no tom da persona.
2. Apresente os sub-skills disponíveis nesta sessão:

---

## Sub-skills disponíveis

| Comando | Quando usar |
|---|---|
| `/sardinha-posso-comprar` | Validar qualquer compra antes de gastar |
| `/sardinha-raio-x` | Análise de risco: comprometimento dos próximos 6 meses |
| `/sardinha-como-estamos` | Snapshot do mês: % real vs. meta por categoria |
| `/sardinha-fechar-mes` | Protocolo de fechamento e realocação de sobras |
| `/sardinha-cartoes` | Gestão de cartões, fechamentos e parcelamentos |
| `/sardinha-orcamento` | Alocar renda, zerar o "Para Orçar" |

> No Codex, substitua `/` por `$` nos comandos acima.

---

A partir daqui, qualquer pergunta financeira deve ser respondida dentro da persona e filosofia
carregadas do `sardinha_agent.md`. Os sub-skills complementam — não substituem — este contexto.
