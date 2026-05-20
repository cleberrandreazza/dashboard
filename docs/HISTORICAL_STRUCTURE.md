# Estrutura histórica (PASSO 4)

## Princípio

O DataInsight **não** usa uma aba por mês nem uma planilha por ano. Cada upload **acrescenta** linhas à mesma base:

```
upload PKB jan → normalized_records (+N linhas)
upload BSS fev → normalized_records (+M linhas)
...
```

Cada registro é uma linha com: `shopping`, `domain`, `platform`, `metric_name`, `year`, `month`, `value`.

## Comparações suportadas no dashboard

| Tipo | Implementação |
|------|----------------|
| Mensal (MoM) | Filtro mês + modo **Mensal**; tabela comparativa período atual vs anterior |
| Trimestral (QoQ) | Filtro trimestre + modo **Trimestral**; série `quarterlySeries` |
| Anual | Modo **Anual**; série `annualSeries` |
| YoY | Mesmo mês/trimestre do ano anterior |
| Sazonalidade | Média de investimento por mês do calendário (todos os anos) |
| Benchmark shoppings | Ranking + share % PKB/BSS/PCN |
| Benchmark canais | Share % por plataforma (Meta, TikTok, Google, etc.) |
| Evolução histórica | Aba **Evolução histórica** com série contínua |

## Escalabilidade (PASSO 9)

- Novos shoppings: detectados no nome do arquivo ou perfil; governança aceita além de PKB/BSS/PCN
- Novos canais: normalização via `platformAliases` no perfil
- Novos anos/meses: colunas matriciais parseadas para `year`/`month`
- Novos KPIs: padrões em `shared/multiplan/metricCatalog.ts`

## Modelagem de abas (PASSO 5)

Ver `shared/multiplan/domainModels.ts` — estrutura sugerida para Mídia, Social, CRM, Influenciadores e Insights executivos.

## Governança (PASSO 6)

Ver `docs/OPERATIONAL_MANUAL.md` e `shared/multiplan/governance.ts` (deduplicação, período obrigatório, avisos de nomenclatura).
