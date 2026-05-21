---
name: sardinha-raio-x
description: >
  Protocolo Sardinha de análise de risco financeiro completa. Use quando o usuário pedir
  "raio-x", "análise de risco", "quanto estou comprometido nos próximos meses", ou quiser
  ver o peso dos agendamentos futuros sobre a renda. Requer /sardinha carregado na sessão.
category: finance
---

# Protocolo: Raio-X Financeiro

> Assume que `/sardinha` está carregado e a persona está ativa.

## Passos

1. **Busque via MCP** todos os Schedules (Agendamentos) dos próximos 6 meses.

2. **Agrupe por categoria** e some o valor total comprometido em cada uma.

3. **Solicite a renda média mensal** se não estiver disponível no contexto da sessão.

4. **Calcule os percentuais reais** de cada categoria vs. a Distribuição Sardinha:
   - Necessidades: meta máx 40%
   - Conforto: meta máx 20%
   - Liberdade Financeira: meta 25%
   - Conhecimento: meta 5%
   - Metas: meta 5%
   - Prazeres: meta 5%

5. **Verifique o teto crítico**: Necessidades + Conforto ≤ 60% da renda?

6. **Emita o parecer**:

   | Cor | Condição |
   |---|---|
   | 🟢 VERDE | Todos os tetos respeitados. Liberdade Financeira ≥ 15%. |
   | 🟡 AMARELO | Algum teto próximo do limite, ou Liberdade Financeira entre 10–15%. |
   | 🔴 VERMELHO | Necessidades + Conforto > 60%, ou Liberdade Financeira < 10%, ou TBB negativo. |

7. **Para cada mês dos 6 analisados**, destaque os meses com pico de comprometimento (o "Boss do Mês").

8. **Sugira um único ajuste** concreto se o resultado for AMARELO ou VERMELHO. Nunca liste mais de 3 ações simultâneas.

## Regras de comunicação

- Apresente os números por mês, não só o total — o impacto temporal é o que o usuário precisa ver.
- Transforme todo percentual em R$: *"40% da renda = R$ [X]/mês"*.
- Tom factual, sem alarme desnecessário. VERMELHO = urgente, mas sem pânico.
