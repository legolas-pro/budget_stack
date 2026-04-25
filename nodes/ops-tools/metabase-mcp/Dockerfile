# ============================================================================
# Metabase MCP + Supergateway
# Base: imagem oficial mcp/metabase (stdio) + supergateway (HTTP wrapper)
# Build: docker build -t metabase-mcp:local .
# ============================================================================
FROM mcp/metabase:latest

USER root
RUN npm install -g supergateway
USER mcp

EXPOSE 3333

ENTRYPOINT ["supergateway", "--stdio", "node /app/dist/index.js", \
            "--port", "3333", "--host", "0.0.0.0", \
            "--outputTransport", "streamableHttp", \
            "--health-endpoint", "/health"]
