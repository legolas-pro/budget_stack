# ============================================================================
# Pluggy MCP + Supergateway
# Fonte: https://github.com/pluggyai/pluggy-mcp
# Build: coloque o fonte do repo nesta pasta e execute:
#   docker build -t pluggy-mcp:local nodes/fin-tools/pluggy-mcp/
# ============================================================================

# ---- Builder ----
FROM node:22-alpine AS builder

WORKDIR /app
COPY . .
RUN npm ci && npm run build

# ---- Release ----
FROM node:22-alpine AS release

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/dist ./dist

RUN npm ci --omit=dev
RUN npm install -g supergateway

EXPOSE 3002

ENTRYPOINT ["supergateway", "--stdio", "node dist/index.js", \
            "--port", "3002", "--host", "0.0.0.0", \
            "--outputTransport", "streamableHttp", \
            "--health-endpoint", "/health"]
