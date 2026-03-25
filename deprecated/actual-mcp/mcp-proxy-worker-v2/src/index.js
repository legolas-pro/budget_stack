export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return corsResponse(new Response(null, { status: 204 }));
    }

    try {
      if (path === "/.well-known/oauth-authorization-server" && request.method === "GET") return corsResponse(handleDiscovery(url));
      if (path === "/.well-known/oauth-protected-resource" && request.method === "GET") return corsResponse(handleProtectedResource(url));
      if (path === "/oauth/register" && request.method === "POST") return corsResponse(await handleRegister(request, env));
      if (path === "/oauth/authorize" && request.method === "GET") return handleAuthorize(url, env);
      if (path === "/oauth/authorize/callback" && request.method === "POST") return await handleAuthorizeCallback(request, env);
      if (path === "/oauth/token" && request.method === "POST") return corsResponse(await handleToken(request, env));
      // MCP endpoints — special handling, no corsResponse wrapper for POST (preserves SSE stream)
      if (path === "/mcp" && request.method === "POST") return await handleMCP(request, env);
      if (path === "/mcp" && request.method === "GET") return new Response("", { status: 405, headers: { "Allow": "POST", "MCP-Protocol-Version": "2025-06-18" } });
      if (path === "/mcp" && request.method === "HEAD") return new Response("", { status: 200, headers: { "MCP-Protocol-Version": "2025-06-18" } });
      if (path === "/mcp" && request.method === "DELETE") return await handleMCPDelete(request, env);

      return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ error: "server_error", message: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  },
};

function corsResponse(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD, DELETE");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function handleDiscovery(url) {
  const base = `${url.protocol}//${url.host}`;
  return Response.json({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["mcp:tools"],
  });
}

function handleProtectedResource(url) {
  const base = `${url.protocol}//${url.host}`;
  return Response.json({
    resource: base,
    authorization_servers: [base],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp:tools"],
  });
}

async function handleRegister(request, env) {
  const body = await request.json().catch(() => ({}));
  return new Response(JSON.stringify({
    client_id: env.CLIENT_ID,
    client_secret: env.CLIENT_SECRET,
    client_name: body.client_name || "MCP Client",
    redirect_uris: body.redirect_uris || ["https://claude.ai/api/mcp/auth_callback"],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "client_secret_post",
  }), { status: 201, headers: { "Content-Type": "application/json" } });
}

function handleAuthorize(url, env) {
  const p = url.searchParams;
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Autorizar MCP</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#0f172a;color:#e2e8f0}
    .card{background:#1e293b;padding:48px 40px;border-radius:16px;max-width:420px;width:90%;box-shadow:0 25px 50px rgba(0,0,0,.4)}
    .logo{font-size:28px;font-weight:700;text-align:center;margin-bottom:8px;color:#38bdf8}
    .subtitle{text-align:center;color:#94a3b8;font-size:14px;margin-bottom:32px}
    .info{background:#334155;padding:12px 16px;border-radius:8px;margin-bottom:24px;font-size:13px;color:#cbd5e1}
    .info strong{color:#f1f5f9}
    input[type=password]{width:100%;padding:14px 16px;border:1px solid #475569;border-radius:8px;background:#0f172a;color:#f1f5f9;font-size:16px;outline:none;transition:border-color .2s}
    input[type=password]:focus{border-color:#38bdf8}
    input[type=password]::placeholder{color:#64748b}
    button{width:100%;padding:14px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;margin-top:16px;transition:background .2s}
    button:hover{background:#1d4ed8}
    .scope{text-align:center;color:#64748b;font-size:12px;margin-top:16px}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Actual Budget MCP</div>
    <div class="subtitle">Autorizar acesso via MCP</div>
    <div class="info">Cliente: <strong>${esc(p.get("client_id"))}</strong><br>Escopo: <strong>${esc(p.get("scope") || "mcp:tools")}</strong></div>
    <form method="POST" action="/oauth/authorize/callback">
      <input type="hidden" name="client_id" value="${esc(p.get("client_id"))}">
      <input type="hidden" name="redirect_uri" value="${esc(p.get("redirect_uri"))}">
      <input type="hidden" name="state" value="${esc(p.get("state"))}">
      <input type="hidden" name="code_challenge" value="${esc(p.get("code_challenge"))}">
      <input type="hidden" name="code_challenge_method" value="${esc(p.get("code_challenge_method") || "S256")}">
      <input type="hidden" name="scope" value="${esc(p.get("scope") || "mcp:tools")}">
      <input type="hidden" name="resource" value="${esc(p.get("resource") || "")}">
      <input type="password" name="password" placeholder="Senha de acesso" required autofocus>
      <button type="submit">Autorizar</button>
    </form>
    <div class="scope">Ao autorizar, o cliente terá acesso às tools do Actual Budget.</div>
  </div>
</body>
</html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function handleAuthorizeCallback(request, env) {
  const form = await request.formData();
  const password = form.get("password") || "";
  if (password !== env.OAUTH_PASSWORD) {
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a;color:#ef4444"><div style="text-align:center"><h2>Acesso negado</h2><p>Senha incorreta. Feche esta aba e tente novamente.</p></div></body></html>`,
      { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
  const code = randomHex(32);
  await env.OAUTH_KV.put(`code:${code}`, JSON.stringify({
    client_id: form.get("client_id"),
    redirect_uri: form.get("redirect_uri"),
    code_challenge: form.get("code_challenge"),
    code_challenge_method: form.get("code_challenge_method") || "S256",
    scope: form.get("scope") || "mcp:tools",
    resource: form.get("resource") || "",
  }), { expirationTtl: 300 });

  const redirectUri = form.get("redirect_uri") || "";
  const state = form.get("state") || "";
  const sep = redirectUri.includes("?") ? "&" : "?";
  return Response.redirect(`${redirectUri}${sep}code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, 302);
}

async function handleToken(request, env) {
  const body = await parseFormOrJson(request);
  const grant_type = body.grant_type || "";

  if (grant_type === "authorization_code") {
    const code = body.code || "";
    const stored = await env.OAUTH_KV.get(`code:${code}`, "json");
    if (!stored) return Response.json({ error: "invalid_grant", error_description: "Authorization code not found or expired" }, { status: 400 });
    if (body.redirect_uri && stored.redirect_uri && body.redirect_uri !== stored.redirect_uri) return Response.json({ error: "invalid_grant", error_description: "redirect_uri mismatch" }, { status: 400 });
    if (stored.code_challenge && body.code_verifier) {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body.code_verifier));
      if (base64url(digest) !== stored.code_challenge) return Response.json({ error: "invalid_grant", error_description: "PKCE validation failed" }, { status: 400 });
    }
    await env.OAUTH_KV.delete(`code:${code}`);
    const access_token = await generateJWT(env, stored.scope || "mcp:tools");
    const refresh_token = randomHex(48);
    await env.OAUTH_KV.put(`rt:${refresh_token}`, JSON.stringify({ scope: stored.scope || "mcp:tools", client_id: stored.client_id }), { expirationTtl: 86400 * 30 });
    return Response.json({ access_token, token_type: "Bearer", expires_in: 3600, refresh_token, scope: stored.scope || "mcp:tools" }, { headers: { "Cache-Control": "no-store" } });
  }

  if (grant_type === "refresh_token") {
    const rt = body.refresh_token || "";
    const stored = await env.OAUTH_KV.get(`rt:${rt}`, "json");
    if (!stored) return Response.json({ error: "invalid_grant", error_description: "Refresh token not found or expired" }, { status: 400 });
    await env.OAUTH_KV.delete(`rt:${rt}`);
    const access_token = await generateJWT(env, stored.scope || "mcp:tools");
    const new_rt = randomHex(48);
    await env.OAUTH_KV.put(`rt:${new_rt}`, JSON.stringify({ scope: stored.scope, client_id: stored.client_id }), { expirationTtl: 86400 * 30 });
    return Response.json({ access_token, token_type: "Bearer", expires_in: 3600, refresh_token: new_rt, scope: stored.scope || "mcp:tools" }, { headers: { "Cache-Control": "no-store" } });
  }

  return Response.json({ error: "unsupported_grant_type" }, { status: 400 });
}

// ============================================
// MCP Proxy — preserva SSE streaming + headers
// ============================================
async function handleMCP(request, env) {
  // Validate OAuth token
  const authHeader = request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized", error_description: "Missing access token" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "WWW-Authenticate": `Bearer resource_metadata="${new URL(request.url).origin}/.well-known/oauth-protected-resource"` },
    });
  }
  const valid = await verifyJWT(authHeader.slice(7), env);
  if (!valid) {
    return new Response(JSON.stringify({ error: "unauthorized", error_description: "Invalid or expired token" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "WWW-Authenticate": `Bearer resource_metadata="${new URL(request.url).origin}/.well-known/oauth-protected-resource"` },
    });
  }

  // Build proxy headers — pass through important MCP headers
  const proxyHeaders = {
    "Content-Type": request.headers.get("Content-Type") || "application/json",
    "Accept": request.headers.get("Accept") || "application/json, text/event-stream",
    "CF-Access-Client-Id": env.CF_ACCESS_CLIENT_ID,
    "CF-Access-Client-Secret": env.CF_ACCESS_CLIENT_SECRET,
  };

  // Pass through Mcp-Session-Id if present
  const sessionId = request.headers.get("Mcp-Session-Id");
  if (sessionId) {
    proxyHeaders["Mcp-Session-Id"] = sessionId;
  }

  // Proxy to backend
  const proxyResponse = await fetch(env.MCP_BACKEND_URL, {
    method: "POST",
    headers: proxyHeaders,
    body: request.body,
  });

  // Build response — preserve ALL upstream headers, especially SSE-related ones
  const responseHeaders = new Headers();

  // Copy critical headers from upstream
  const passHeaders = [
    "content-type",
    "cache-control",
    "connection",
    "mcp-session-id",
    "x-powered-by",
  ];
  for (const h of passHeaders) {
    const val = proxyResponse.headers.get(h);
    if (val) responseHeaders.set(h, val);
  }

  // Add CORS
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");
  responseHeaders.set("Access-Control-Expose-Headers", "Mcp-Session-Id");

  // Return streaming response directly — do NOT buffer
  return new Response(proxyResponse.body, {
    status: proxyResponse.status,
    headers: responseHeaders,
  });
}

// Handle DELETE /mcp (session cleanup)
async function handleMCPDelete(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response("", { status: 401 });
  }
  const valid = await verifyJWT(authHeader.slice(7), env);
  if (!valid) {
    return new Response("", { status: 401 });
  }

  const proxyHeaders = {
    "CF-Access-Client-Id": env.CF_ACCESS_CLIENT_ID,
    "CF-Access-Client-Secret": env.CF_ACCESS_CLIENT_SECRET,
  };
  const sessionId = request.headers.get("Mcp-Session-Id");
  if (sessionId) proxyHeaders["Mcp-Session-Id"] = sessionId;

  const proxyResponse = await fetch(env.MCP_BACKEND_URL, {
    method: "DELETE",
    headers: proxyHeaders,
  });

  return new Response(proxyResponse.body, {
    status: proxyResponse.status,
    headers: proxyResponse.headers,
  });
}

// ============================================
// JWT helpers
// ============================================
async function generateJWT(env, scope) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: env.ISSUER || "https://mcp-actual.dinamopro.com", sub: "user", aud: env.ISSUER || "https://mcp-actual.dinamopro.com", scope, iat: now, exp: now + 3600, jti: crypto.randomUUID() };
  const unsigned = b64url(JSON.stringify(header)) + "." + b64url(JSON.stringify(payload));
  const key = await getSigningKey(env);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(unsigned));
  return unsigned + "." + base64url(sig);
}

async function verifyJWT(token, env) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const key = await getSigningKey(env);
    const valid = await crypto.subtle.verify("HMAC", key, base64urlDecode(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
    if (!valid) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch { return false; }
}

async function getSigningKey(env) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(env.JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

// ============================================
// Utilities
// ============================================
function b64url(str) { return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function base64url(buffer) { const b = new Uint8Array(buffer); let s = ""; for (const x of b) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function base64urlDecode(str) { const b = str.replace(/-/g, "+").replace(/_/g, "/"); const p = b.length % 4; const s = atob(p ? b + "====".slice(p) : b); const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a.buffer; }
function randomHex(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, "0")).join(""); }
function esc(s) { return (s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
async function parseFormOrJson(request) {
  const ct = (request.headers.get("Content-Type") || "").toLowerCase();
  if (ct.includes("application/x-www-form-urlencoded")) { const t = await request.text(); const p = new URLSearchParams(t); const o = {}; for (const [k, v] of p) o[k] = v; return o; }
  if (ct.includes("application/json")) return request.json();
  const t = await request.text(); try { return JSON.parse(t); } catch { const p = new URLSearchParams(t); const o = {}; for (const [k, v] of p) o[k] = v; return o; }
}