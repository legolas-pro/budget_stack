export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const N8N_BASE = env.N8N_WEBHOOK_URL || "https://din-wh.dinamopro.com";

    // --- CORS preflight ---
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // --- Route mapping ---
    // mcp-actual.dinamopro.com/PATH → din-wh.dinamopro.com/webhook/PATH
    const routeMap = {
      "/.well-known/oauth-authorization-server": "/webhook/.well-known/oauth-authorization-server",
      "/.well-known/oauth-protected-resource": "/webhook/.well-known/oauth-protected-resource",
      "/oauth/register": "/webhook/oauth/register",
      "/oauth/authorize": "/webhook/oauth/authorize",
      "/oauth/authorize/callback": "/webhook/oauth/authorize/callback",
      "/oauth/token": "/webhook/oauth/token",
      "/mcp": "/webhook/mcp",
    };

    const targetPath = routeMap[path];

    if (!targetPath) {
      return new Response(
        JSON.stringify({ error: "not_found", message: "Unknown endpoint" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // --- Build proxy URL ---
    const targetUrl = new URL(targetPath, N8N_BASE);
    // Preserve query string (important for /oauth/authorize)
    targetUrl.search = url.search;

    // --- Proxy the request ---
    const proxyHeaders = new Headers(request.headers);
    // Override Host to match n8n's expected domain
    proxyHeaders.set("Host", new URL(N8N_BASE).host);
    // Pass original host for reference
    proxyHeaders.set("X-Forwarded-Host", url.host);
    proxyHeaders.set("X-Forwarded-Proto", "https");

    const proxyRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: proxyHeaders,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
      redirect: "manual", // Don't follow redirects — pass them through
    });

    try {
      const response = await fetch(proxyRequest);

      // --- Pass response through with CORS ---
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");

      // For redirects (302 from /oauth/authorize/callback), pass through as-is
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "proxy_error", message: err.message }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};
