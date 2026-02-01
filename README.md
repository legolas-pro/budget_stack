# Stacks (Portainer + Swarm)

Repositorio de stacks por VPS. Cada VPS fica em `environments/`; arquivos no root sao globais.

## Estrutura
- `environments/`: uma pasta por VPS
- Root: stacks globais (ex.: traefik global)

## Padrao de nomes
- Sem espacos: use kebab-case
- Versoes no nome: `stack-nome-v1.yaml`

## Uso no Portainer
Crie uma stack por arquivo e aponte para o path do arquivo no Git.

## Como trabalhamos
- Branches: main (producao), develop (staging), feature/* (dia a dia), hotfix/* (urgente em producao)
- Promocao para producao: PR de develop para main, merge em main e tag de release
