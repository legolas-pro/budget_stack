# Pluggy MCP Client Reference

Referencia para conectar clientes MCP ao servico `pluggy-mcp` publicado pela stack [docker-compose.yaml](../docker-compose.yaml).

## Endpoint

- Transporte: `SSE`
- Porta publica padrao: `3002`
- Endpoint MCP: `http://localhost:3002/sse`
- Healthcheck: `http://localhost:3002/health`
- Imagem padrao: `ghcr.io/git-dinamo/pluggy-mcp:latest`

Se a stack estiver em outro host, troque `localhost` pelo dominio ou IP publicado.

## Pre-requisitos

- A stack `actual` precisa estar em execucao.
- O servico `pluggy-mcp` precisa estar `healthy`.
- O arquivo de ambiente precisa definir `PLUGGY_API_KEY`.

Teste rapido:

```bash
curl http://localhost:3002/health
```

Resposta esperada:

```json
{"status":"OK","server":"pluggy-api","version":"1.0.0"}
```

## Instalacao nos clientes

### Claude Code

```bash
claude mcp add pluggy-mcp sse http://localhost:3002/sse
```

### Codex CLI

```bash
codex mcp add sse pluggy-mcp http://localhost:3002/sse
```

### Gemini CLI

```bash
gemini mcp add sse pluggy-mcp http://localhost:3002/sse
```

## Exemplo remoto

Se o servico estiver exposto externamente:

```bash
claude mcp add pluggy-mcp sse https://SEU-DOMINIO/pluggy/sse
codex mcp add sse pluggy-mcp https://SEU-DOMINIO/pluggy/sse
gemini mcp add sse pluggy-mcp https://SEU-DOMINIO/pluggy/sse
```

Mantenha o path `/sse`. O servidor atual nao usa `streamableHttp` nem `/mcp`.

## Troubleshooting

- Container preso em `Starting`: a imagem sobe na porta interna `3000`; a stack deve publicar `3002:3000` e o healthcheck deve consultar `127.0.0.1:3000/health`.
- Cliente conecta mas as tools falham na API da Pluggy: confirme `PLUGGY_API_KEY` no deploy.
- `404` no endpoint MCP: o path correto e `/sse`.
- Exposicao publica: o MCP nao tem autenticacao propria na borda; se for publicar na internet, proteja com rede privada, proxy autenticado ou outra camada de acesso.
