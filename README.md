# Budget Stack

Stack Docker para Actual Budget, integrações MCP e sincronização para BI.

## 🔌 Conectando o Pluggy MCP aos Assistants

Referência completa: [docs/pluggy-mcp-client-reference.md](docs/pluggy-mcp-client-reference.md)

O serviço do Pluggy MCP roda localmente utilizando Server-Sent Events (SSE) na porta `3002`. Como você está utilizando todas as ferramentas via CLI, basta rodar os comandos abaixo nos seus respectivos terminais para plugar o serviço:

### 🤖 Claude Code
```bash
claude mcp add pluggy-mcp sse http://localhost:3002/sse
```

### 💻 Codex
```bash
codex mcp add sse pluggy-mcp http://localhost:3002/sse
```

### ♊ Gemini CLI
```bash
gemini mcp add sse pluggy-mcp http://localhost:3002/sse
```

*(Dica: após adicionar os servidores nas ferramentas, você pode utilizar os comandos de listagem nativos, como `/mcp list` no Gemini, para confirmar se os conectores e as rotas da API foram carregados corretamente).*
