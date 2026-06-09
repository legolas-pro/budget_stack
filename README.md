# Budget Stack

Stack Docker Swarm enxuta para orçamento pessoal com IA.

Combina o [Actual Budget](https://actualbudget.org/) com uma REST API auxiliar e classificação automática de transações via LLM.

## Arquitetura

| Serviço | Descrição | Porta padrão |
|---------|-----------|-------------|
| `app` | Actual Budget UI | `5006` |
| `api` | REST API ([actual-http-api](https://github.com/jhonderson/actual-http-api)) | `5007` |
| `actual_ai` | Classificação automática de transações via LLM | — |

## Pré-requisitos

- Docker com Swarm inicializado (`docker swarm init`)
- Chave de API de um LLM (OpenAI, Anthropic, Groq, etc.) para o `actual_ai`

## Configuração

1. Copie o arquivo de exemplo e preencha as variáveis:

```bash
cp actual.env.example actual.env
```

2. Edite `actual.env` com suas credenciais reais. As variáveis obrigatórias estão marcadas com `<ALTERAR>`.

> **Segurança:** `actual.env` esta no `.gitignore` e nunca deve ser commitado. Nunca compartilhe esse arquivo.

## Deploy

```bash
docker stack deploy -c docker-compose.yaml actual_budget --env-file actual.env
```

Para derrubar a stack:

```bash
docker stack rm actual_budget
```

## Copiloto Sardinha — Skills Framework

O Copiloto Sardinha é o agente conversacional de análise financeira deste projeto. Ele opera em modo somente leitura sobre os dados do Actual Budget (via MCP) e implementa o Método Sardinha de orçamento base zero.

O copiloto é dividido em um **skill principal** (inicializador de sessão) e **sub-skills** por protocolo. Sempre carregue `/sardinha` primeiro — ele lê a persona completa em `sardinha_agent.md` e lista os sub-skills disponíveis.

| Skill | Comando | Função |
|---|---|---|
| `sardinha` | `/sardinha` | Inicializador obrigatório — carrega persona e contexto |
| `sardinha-posso-comprar` | `/sardinha-posso-comprar` | Validar qualquer compra antes de gastar |
| `sardinha-raio-x` | `/sardinha-raio-x` | Análise de risco: comprometimento dos próximos 6 meses |
| `sardinha-como-estamos` | `/sardinha-como-estamos` | Snapshot do mês: % real vs. meta por categoria |
| `sardinha-fechar-mes` | `/sardinha-fechar-mes` | Fechamento mensal e realocação de sobras |
| `sardinha-cartoes` | `/sardinha-cartoes` | Gestão de cartões, fechamentos e parcelamentos |
| `sardinha-orcamento` | `/sardinha-orcamento` | Alocar renda e zerar o "Para Orçar" |

> No Codex, substitua `/` por `$` em todos os comandos.

### Instalação dos skills

As skills abaixo são para o usuário final do Budget Stack e ficam em `client/skills/`. As skills internas para manutenção deste repositório ficam em `.agents/skills/` e não fazem parte da instalação do cliente.

```bash
npx skills add legolas-pro/budget_stack --skill-path client/skills/sardinha
npx skills add legolas-pro/budget_stack --skill-path client/skills/sardinha-posso-comprar
npx skills add legolas-pro/budget_stack --skill-path client/skills/sardinha-raio-x
npx skills add legolas-pro/budget_stack --skill-path client/skills/sardinha-como-estamos
npx skills add legolas-pro/budget_stack --skill-path client/skills/sardinha-fechar-mes
npx skills add legolas-pro/budget_stack --skill-path client/skills/sardinha-cartoes
npx skills add legolas-pro/budget_stack --skill-path client/skills/sardinha-orcamento
```

Alguns skills dependem de servidores MCP externos à stack enxuta. Configure esses MCPs separadamente antes de usar os sub-skills de análise.

---

## Conectando os servidores MCP aos assistentes

Se você mantiver servidores MCP separados via SSE, eles expõem dados financeiros sensíveis. O caminho recomendado é conectar em modo **somente leitura**, principalmente para Antigravity.

> [!CAUTION]
> O `actual_mcp` pode expor tools de escrita quando iniciado com `--enable-write`. O `disabledTools` abaixo reduz a superfície disponível no Antigravity, mas a garantia forte de read-only é rodar o `actual_mcp` sem `--enable-write` ou publicar um endpoint separado só para leitura.

### Antigravity (read-only recomendado)

No Antigravity, abra `MCP Servers` > `Manage MCP Servers` > `View raw config` e mescle o bloco abaixo em `~/.gemini/antigravity/mcp_config.json`.

```json
{
  "mcpServers": {
    "actual-mcp": {
      "serverUrl": "http://localhost:3001/sse",
      "headers": {
        "Authorization": "Bearer SEU_ACTUAL_API_KEY"
      },
      "disabledTools": [
        "create-transaction",
        "update-transaction",
        "delete-transaction",
        "create-category",
        "update-category",
        "delete-category",
        "create-category-group",
        "update-category-group",
        "delete-category-group",
        "create-payee",
        "update-payee",
        "delete-payee",
        "create-rule",
        "update-rule",
        "delete-rule"
      ]
    },
    "pluggy-mcp": {
      "serverUrl": "http://localhost:3002/sse"
    }
  }
}
```

Depois de salvar, atualize/reinicie a lista de MCPs no Antigravity e confirme que os dois servidores aparecem como conectados.

> [!TIP]
> O `pluggy-mcp` já é somente leitura no código atual (`listConnectors`, `getAccounts`, `getTransactions`). O bloqueio acima é especialmente importante para o `actual-mcp`.

### Outros clientes

Para integrar sem a camada read-only do exemplo acima, ou para usar clientes como Codex, Claude Code e Gemini CLI, leia a documentação da pasta [`docs/`](docs/):

- [Referência de conexão do Pluggy MCP](docs/pluggy-mcp-client-reference.md)
- [Briefing de tools MCP para agente financeiro](docs/briefing-agente-mcp-financas.md)
- [Contexto operacional para Antigravity](antigravity.md)

## Classificação automática com IA (Actual AI)

O serviço `actual_ai` usa o [actual-ai](https://github.com/sakowicz/actual-ai) para classificar transações automaticamente via LLM.

Importante: o `actual_ai` em si classifica transações já existentes. Nesta stack, o escopo de `FEATURES` ficou fixado no código para classificar sem `dryRun` e sem `syncAccountsBeforeClassify`.

Configure o provedor no `actual.env`:

```env
ACTUAL_AI_LLM_PROVIDER=openai          # openai | anthropic | groq | openrouter | google | ollama
ACTUAL_AI_OPENAI_API_KEY=sk-...
ACTUAL_AI_OPENAI_MODEL=gpt-4o-mini
```

Com isso, a stack deixa a classificação desacoplada da importação bancária e grava categoria de fato no orçamento.

O prompt de classificação (Sardinha) já está embutido no `docker-compose.yaml` e pode ser customizado via `PROMPT_TEMPLATE`.

## Variáveis de ambiente

Consulte [`actual.env.example`](actual.env.example) para a lista completa e documentada de todas as variáveis disponíveis.
