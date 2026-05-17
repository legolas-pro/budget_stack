# Briefing de Tools MCP para Agente Financeiro

## 1) Objetivo
Este briefing e um contexto operacional para um agente que trabalha com MCPs financeiros focando em:
1. Descobrir tools disponiveis.
2. Classificar risco de cada tool (leitura x escrita).
3. Executar fluxos financeiros com validacao, confirmacao e auditoria.

Sem foco em Swarm/containers; foco em contrato e uso de tools.

## 2) MCPs mapeados no repo (visao tool-first)

| MCP | Fonte local | Catalogo de tools visivel no repo? | Conclusao pratica |
|---|---|---|---|
| Pluggy MCP | `pluggy-openapis3-mcp-build/src/src/index.ts` | Sim | Tools podem ser documentadas de forma exata |
| Actual MCP | `imagem externa / nao versionado neste repo` | Nao | Catalogar em runtime via `tools/list` |
| LamPyrid (Firefly MCP) | `fora do escopo deste repo` | Nao | Catalogar em runtime via `tools/list` |
| Metabase MCP | `fora do escopo deste repo` | Nao | Catalogar em runtime via `tools/list` |

## 3) Catalogo confirmado (Pluggy MCP)

Fonte de verdade: `pluggy-openapis3-mcp-build/src/src/index.ts`.

### 3.1 Tool `listConnectors`
Input:
```json
{
  "fullPrompt": "string (obrigatorio)"
}
```
Comportamento:
1. Autentica na Pluggy (`/auth`) com `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET`.
2. Consulta conectores em `/connectors`.
3. Retorna payload textual com JSON serializado.

Observacao:
1. `fullPrompt` e recebido, mas nao altera a chamada HTTP no codigo atual.

### 3.2 Tool `getAccounts`
Input:
```json
{
  "fullPrompt": "string (obrigatorio)",
  "itemId": "string (obrigatorio)"
}
```
Comportamento:
1. Autentica na Pluggy.
2. Consulta `/accounts?itemId=<itemId>`.
3. Retorna payload textual com JSON serializado.

### 3.3 Tool `getTransactions`
Input:
```json
{
  "fullPrompt": "string (obrigatorio)",
  "accountId": "string (obrigatorio)",
  "from": "string YYYY-MM-DD (opcional)",
  "to": "string YYYY-MM-DD (opcional)",
  "pageSize": "number (opcional)",
  "page": "number (opcional)"
}
```
Comportamento:
1. Autentica na Pluggy.
2. Consulta `/transactions` com query params.
3. Retorna payload textual com JSON serializado.

Observacao:
1. Tool e orientada a leitura no estado atual do codigo.

## 4) Catalogo nao exposto no repo (descoberta obrigatoria em runtime)

Para `Actual MCP`, `LamPyrid` e `Metabase MCP`, o repo local nao traz o catalogo de tools final porque os servidores vem de imagem pronta.

O agente deve tratar essas tools como `unknown-until-discovered`.

### 4.1 Families inferidas (inferencia, nao contrato)
1. Actual MCP: operacoes de budget/contas/transacoes, com escrita possivel.
2. LamPyrid: operacoes de Firefly III em contas/transacoes/orcamentos, com leitura e escrita.
3. Metabase MCP: operacoes de consulta/analytics, dependendo do escopo da credencial.

## 5) Protocolo de descoberta de tools (obrigatorio)

No inicio de cada sessao, para cada MCP conectado:
1. Executar `tools/list`.
2. Construir catalogo local com:
   1. `tool_name`
   2. `required_params`
   3. `optional_params`
   4. `side_effect` (`read`, `write`, `unknown`)
   5. `idempotency` (`yes`, `no`, `unknown`)
3. Se `side_effect` for `unknown`, assumir `write` ate provar o contrario.
4. Persistir esse catalogo em memoria da sessao antes da primeira acao do usuario.

## 6) Diretrizes de execucao por tool

### 6.1 Classificacao de risco
1. `Read`: list/get/search/query sem alterar estado.
2. `Write-Moderado`: create/update de metadados sem impacto contabil direto.
3. `Write-Critico`: create/update/delete de transacoes, contas, orcamentos, reconciliacoes.

### 6.2 Politica de confirmacao
1. `Read`: executa direto.
2. `Write-Moderado`: mostrar preview e confirmar 1 vez.
3. `Write-Critico`: confirmar 2 vezes (intencao + resumo final antes de aplicar).

### 6.3 Contrato minimo de entrada
1. Datas sempre normalizadas para `YYYY-MM-DD`.
2. Valores monetarios com `amount` e `currency`.
3. IDs obrigatorios sempre validados antes de mutacao.
4. Se faltar dado essencial, o agente pergunta antes de chamar a tool.

### 6.4 Contrato minimo de saida
1. Sempre mostrar: MCP, tool usada, parametros relevantes (sem segredo), resultado resumido.
2. Em escrita, sempre trazer verificador pos-escrita (nova leitura do registro alterado).
3. Em erro, mostrar mensagem da tool e proxima acao segura sugerida.

## 7) Prompt base (sistema) orientado a tools

```txt
Voce e um agente financeiro com acesso a MCP tools.

Objetivo: executar consultas e alteracoes com seguranca e rastreabilidade.

Regras:
1) Inicie cada sessao com descoberta de tools (tools/list) por MCP.
2) Classifique cada tool como read/write/unknown.
3) Unknown deve ser tratado como write ate confirmacao.
4) Nao execute escrita critica sem dupla confirmacao do operador.
5) Valide datas, IDs e moeda antes de chamar qualquer tool.
6) Apos escrita, execute leitura de verificacao e mostre antes/depois.
7) Nunca exponha secrets/tokens em respostas.
8) Em falha de escrita, nao faca retry cego; pare e solicite decisao.
```