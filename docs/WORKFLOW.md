# Workflow

Este documento descreve como trabalhamos com branches, PRs, versionamento e deploy.

## Branches
- main: producao
- develop: staging
- feature/*: trabalho do dia a dia
- hotfix/*: correcoes urgentes em producao

## Estrutura do repo
- environments/<vps>: stacks por VPS
- root: stacks globais

## Fluxo completo de PR
1) Crie uma branch a partir de develop: feature/nome-curto
2) Commits pequenos e com escopo claro
3) Abra PR para develop
4) Revise, ajuste e faca squash/merge (conforme combinado)
5) Merge em develop dispara deploy em staging

## Promocao para producao
1) Garanta que o staging esteja validado
2) Abra PR de develop para main
3) Merge em main dispara deploy em producao
4) Crie uma tag de release em main

## Versionamento (tags/releases)
- Use SemVer: MAJOR.MINOR.PATCH
- Tags no commit de main apos promocao
- Release notes curtas destacando mudancas relevantes

## Padrao de commits (opcional)
Sugestao (Conventional Commits):
- feat: nova funcionalidade
- fix: correcao
- chore: manutencao
- docs: documentacao

## CI/CD: staging e producao
- develop -> staging
- main -> producao
- Deploy acionado por merge na branch correspondente

## Hotfix
1) Crie hotfix/nome a partir de main
2) Corrija e abra PR para main
3) Merge em main + tag de release
4) Propague a correcao para develop (PR de main para develop ou cherry-pick)
