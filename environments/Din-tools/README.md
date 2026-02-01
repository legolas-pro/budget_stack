# Din-njs Stack - N8N Production Environment

**Stack:** din-njs-v3.yaml
**VPS:** Din-tools
**Autor:** Legolas @ Dinamo Pro

---

## Arquitetura dos Serviços

```mermaid
flowchart TB
    subgraph INTERNET["Internet"]
        USER["Usuário"]
        EXTERNAL["Sistemas Externos"]
    end

    subgraph TRAEFIK["traefik_public (rede externa)"]
        TRF["Traefik Proxy"]
    end

    subgraph STACK["Stack din-njs / din-njs-stag"]
        subgraph INTERNAL["internal_network (rede isolada)"]
            direction TB

            subgraph DB["Banco de Dados"]
                PG["PostgreSQL\n:5432 interno\n:POSTGRES_PORT_EXTERNAL externo"]
            end

            subgraph QUEUE["Sistema de Filas"]
                REDIS["Redis\n:6379 interno\n:REDIS_PORT_EXTERNAL externo"]
            end

            subgraph N8N["Serviços N8N"]
                EDITOR["n8n_editor\nInterface Principal\n:5678"]
                WEBHOOK["n8n_webhook\nProcessador Webhooks\n:5678"]
                WORKER["n8n_worker\nProcessador Filas\nconcurrency=10"]
            end
        end
    end

    USER --> TRF
    EXTERNAL --> TRF
    TRF -->|"N8N_HOST"| EDITOR
    TRF -->|"WEBHOOK_HOST"| WEBHOOK

    EDITOR --> PG
    EDITOR --> REDIS
    WEBHOOK --> PG
    WEBHOOK --> REDIS
    WORKER --> PG
    WORKER --> REDIS
```

---

## Fluxo de Dados

```mermaid
sequenceDiagram
    participant U as Usuário
    participant T as Traefik
    participant E as n8n_editor
    participant W as n8n_webhook
    participant R as Redis
    participant WK as n8n_worker
    participant P as PostgreSQL

    rect rgb(200, 220, 255)
        Note over U,E: Acesso ao Editor
        U->>T: Acessa N8N_HOST
        T->>E: Proxy reverso
        E->>P: Consulta workflows
        P-->>E: Dados
        E-->>U: Interface
    end

    rect rgb(200, 255, 220)
        Note over U,WK: Execução via Webhook
        U->>T: Trigger webhook
        T->>W: WEBHOOK_HOST
        W->>R: Enfileira job
        R->>WK: Processa fila
        WK->>P: Executa/salva
        P-->>WK: Resultado
    end
```

---

## Pipeline de Branches e Deploy

```mermaid
flowchart LR
    subgraph GIT["Repositório Git"]
        DEV["develop\n(staging)"]
        MAIN["main\n(production)"]
    end

    subgraph DEPLOY_STAG["Deploy Staging"]
        STAG["din-njs-stag\n• Rede: din-njs-stag_internal_network\n• Volumes isolados"]
    end

    subgraph DEPLOY_PROD["Deploy Production"]
        PROD["din-njs\n• Rede: din-njs_internal_network\n• Volumes isolados"]
    end

    DEV -->|"1. Desenvolve\ne testa"| STAG
    STAG -->|"2. Valida em\nstaging"| DEV
    DEV -->|"3. git merge\nmain"| MAIN
    MAIN -->|"4. Deploy\nprodução"| PROD

    style DEV fill:#f9f,stroke:#333
    style MAIN fill:#9f9,stroke:#333
    style STAG fill:#ffc,stroke:#333
    style PROD fill:#cff,stroke:#333
```

---

## Isolamento de Redes (Swarm)

```mermaid
flowchart TB
    subgraph SWARM["Docker Swarm"]
        subgraph NET_STAG["din-njs-stag_internal_network"]
            S_PG["postgres"]
            S_REDIS["redis"]
            S_EDITOR["n8n_editor"]
            S_WEBHOOK["n8n_webhook"]
            S_WORKER["n8n_worker"]
        end

        subgraph NET_PROD["din-njs_internal_network"]
            P_PG["postgres"]
            P_REDIS["redis"]
            P_EDITOR["n8n_editor"]
            P_WEBHOOK["n8n_webhook"]
            P_WORKER["n8n_worker"]
        end

        TRAEFIK["traefik_public\n(rede compartilhada)"]
    end

    S_EDITOR -.-> TRAEFIK
    S_WEBHOOK -.-> TRAEFIK
    P_EDITOR -.-> TRAEFIK
    P_WEBHOOK -.-> TRAEFIK

    NET_STAG x--x|"ISOLADOS"| NET_PROD
```

> O Docker Swarm adiciona automaticamente o prefixo do nome da stack nas redes, garantindo isolamento entre staging e produção.

---

## Diferenças de Variáveis por Ambiente

| Variável | Staging (`develop`) | Production (`main`) |
|----------|---------------------|---------------------|
| **Stack Name** | `din-njs-stag` | `din-njs` |
| **TRAEFIK_PREFIX** | `din-njs-stag` | `din-njs` |
| **POSTGRES_PORT_EXTERNAL** | `5436` | `5435` |
| **REDIS_PORT_EXTERNAL** | `6381` | `6380` |
| **N8N_HOST** | `din-njs-stag.dinamopro.com` | `din-njs.dinamopro.com` |
| **WEBHOOK_HOST** | `din-wh-stag.dinamopro.com` | `din-wh.dinamopro.com` |
| **DB_NAME** | `n8n_queue_stag` | `n8n_queue` |
| **N8N_ENCRYPTION_KEY** | Chave única staging | Chave única produção |

---

## Comandos de Deploy

### Staging (branch `develop`)
```bash
# Arquivo .env: din-njs-v3-stag.env
docker stack deploy -c din-njs-v3.yaml din-njs-stag --env-file din-njs-v3-stag.env
```

### Production (branch `main`)
```bash
# Arquivo .env: din-njs-v3.env
docker stack deploy -c din-njs-v3.yaml din-njs --env-file din-njs-v3.env
```

---

## Workflow de Atualização

```mermaid
flowchart TD
    A["Alteração no código"] --> B["Commit em develop"]
    B --> C["Deploy Staging"]
    C --> D{"Testes OK?"}
    D -->|"Não"| E["Corrigir e\ncommitar"]
    E --> C
    D -->|"Sim"| F["git checkout main"]
    F --> G["git merge develop"]
    G --> H["Deploy Production"]
    H --> I["Monitorar"]
```

---

## Recursos por Serviço

| Serviço | CPU Limite | Memória Limite | CPU Reserva | Memória Reserva |
|---------|------------|----------------|-------------|-----------------|
| PostgreSQL | 2.0 | 2048M | 0.5 | 512M |
| Redis | 1.0 | 2048M | 0.25 | 512M |
| n8n_editor | 1.0 | 1024M | 0.3 | 512M |
| n8n_webhook | 1.0 | 1024M | 0.3 | 512M |
| n8n_worker | 1.5 | 1536M | 0.4 | 768M |

---

## Volumes

| Volume | Tipo | Descrição |
|--------|------|-----------|
| `postgres_data` | External | Dados persistentes do PostgreSQL |
| `n8n_redis` | Local | Dados persistentes do Redis |

> **Nota:** O volume `postgres_data` deve ser criado manualmente antes do primeiro deploy.
