# ============================================================================
# Actual Budget MCP + Supergateway
# Base: sstefanov/actual-mcp (stdio) + supergateway (HTTP wrapper)
# Build: docker build -t actual-mcp:local .
# ============================================================================
FROM sstefanov/actual-mcp:latest

RUN npm install -g supergateway

EXPOSE 3001

ENTRYPOINT ["supergateway", "--stdio", "node build/index.js --enable-write", \
            "--port", "3001", "--host", "0.0.0.0", \
            "--outputTransport", "streamableHttp", \
            "--health-endpoint", "/health"]
