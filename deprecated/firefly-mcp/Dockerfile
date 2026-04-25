# ============================================================================
# Firefly MCP (LamPyrid) + Supergateway
# Build: docker build -t firefly-mcp:local nodes/fin-tools/firefly-mcp/
# ============================================================================
FROM python:3.14-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates \
      git \
      nodejs \
      npm \
      wget \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

WORKDIR /opt/lampyrid
RUN git clone --depth=1 https://github.com/RadCod3/LamPyrid.git .
RUN uv sync --no-dev

RUN npm install -g supergateway

COPY entrypoint.sh /usr/local/bin/firefly-mcp-entrypoint.sh
RUN chmod +x /usr/local/bin/firefly-mcp-entrypoint.sh

ENV PATH="/opt/lampyrid/.venv/bin:${PATH}"

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/firefly-mcp-entrypoint.sh"]
