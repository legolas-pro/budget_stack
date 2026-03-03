# ============================================================================
# Firefly MCP (LamPyrid) + Supergateway
# Base: ghcr.io/radcod3/lampyrid (stdio) + supergateway (HTTP wrapper)
# Build: docker build -t firefly-mcp:local .
# ============================================================================
FROM ghcr.io/radcod3/lampyrid:latest

USER root

RUN set -eux; \
    if command -v apk >/dev/null 2>&1; then \
      apk add --no-cache nodejs npm; \
    elif command -v apt-get >/dev/null 2>&1; then \
      apt-get update; \
      apt-get install -y --no-install-recommends nodejs npm; \
      rm -rf /var/lib/apt/lists/*; \
    else \
      echo "Unsupported base image: no apk/apt-get available for installing node/npm"; \
      exit 1; \
    fi; \
    npm install -g supergateway

COPY entrypoint.sh /usr/local/bin/firefly-mcp-entrypoint.sh
RUN chmod +x /usr/local/bin/firefly-mcp-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/firefly-mcp-entrypoint.sh"]
