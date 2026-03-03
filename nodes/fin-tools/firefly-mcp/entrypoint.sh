#!/bin/sh
set -eu

# LamPyrid precisa operar em stdio quando fica atrás do supergateway.
export MCP_TRANSPORT="${MCP_TRANSPORT:-stdio}"

MCP_HTTP_PATH="${FIREFLY_MCP_HTTP_PATH:-/mcp}"
MCP_STDIO_CMD="${FIREFLY_MCP_STDIO_CMD:-lampyrid}"
MCP_OUTPUT_TRANSPORT="${FIREFLY_MCP_OUTPUT_TRANSPORT:-streamableHttp}"
MCP_HEALTH_ENDPOINT="${FIREFLY_MCP_HEALTH_ENDPOINT:-/health}"
MCP_BIND_HOST="${MCP_HOST:-0.0.0.0}"
MCP_BIND_PORT="${MCP_PORT:-3000}"

exec supergateway \
  --stdio "${MCP_STDIO_CMD}" \
  --host "${MCP_BIND_HOST}" \
  --port "${MCP_BIND_PORT}" \
  --outputTransport "${MCP_OUTPUT_TRANSPORT}" \
  --streamableHttpPath "${MCP_HTTP_PATH}" \
  --health-endpoint "${MCP_HEALTH_ENDPOINT}"
