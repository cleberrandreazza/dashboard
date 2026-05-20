# Diagnóstico — Planilhas Multiplan Regional Sul 2026

Análise das planilhas: **BSS - 2026.xlsx**, **PCN - 2026.xlsx**, **PKB - 2026 .xlsx**

## PASSO 1 — Inventário de abas

| Aba | PKB | BSS | PCN | Domínio | Layout |
|-----|-----|-----|-----|---------|--------|
| Redes Sociais | ✓ | ✓ | ✓ | social_media | Matricial (plataforma × métrica × mês) |
| Analytics, GMN e Buzzmonitor | ✓ | ✓ | ✓ | analytics | Matricial |
| Multi / Multi e MultiVC | ✓ | ✓ | ✓ | multi_app | Matricial |
| Shopping | ✓ | ✓ | ✓ | shopping | Matricial (KPIs operacionais) |
| Influs | ✓ | ✓ | ✓ | influencers | Tabular (TikTok + Instagram) |
| Fornecedores Digital | ✓ | ✓ | ✓ | vendors | Matricial (investimento fornecedor) |
| Barracadabra | — | ✓ | — | venue | Matricial (BSS) |
| Parque do Park | — | — | ✓ | venue | Matricial (PCN) |
| onde buscar os dados | ✓ | ✓ | ✓ | metadata | Ignorar (links) |

## Problemas estruturais identificados

### Críticos (quebram BI / Looker)
1. **Formato matricial** — métricas nas linhas, meses nas colunas (não é tabela longa).
2. **Layouts diferentes** — PKB/BSS usam coluna B para rótulos; PCN usa coluna A em várias seções.
3. **Nomenclatura inconsistente** — `Alcanc` vs `Alcance`, `Vis. De Vídeo` vs `Visualizações`.
4. **Valores formatados** — `R$ 8.384,85`, `29.67` (milhares abreviados), `56.2K`.
5. **Dados qualitativos misturados** — “Resumo mês a mês de ativações” na mesma aba que KPIs numéricos.
6. **Histórico em colunas** — Jan.26… Dez.26 na horizontal (exige unpivot para base histórica).

### Médios
- Aba **Influs** vazia em BSS; PCN/PKB com dados reais.
- **Analytics** com datas antigas (Fev.22) em alguns blocos — possível template não atualizado.
- **Shopping PKB** — vendas/fluxo vazios no recorte analisado.
- Abas específicas por shopping (Barracadabra, Parque do Park) — tratadas via perfil dinâmico.

### Governança
- Sem dropdown de plataforma/shopping.
- Texto livre em ativações e insights.
- Risco de duplicidade se analistas copiarem blocos de mês.

## Resultado do parser (validação)

| Arquivo | Shopping | Métricas normalizadas | Investimento detectado |
|---------|----------|----------------------|------------------------|
| BSS - 2026 | BSS | ~471 | 16 linhas |
| PCN - 2026 | PCN | ~657 | 28 linhas |
| PKB - 2026 | PKB | ~537 | 14 linhas |

## Modelo normalizado (saída do sistema)

Cada célula válida vira um registro:

```
shopping | domain | sheet_name | platform | metric_name | period_label | year | month | value
```

Exemplo:
```
PCN | social_media | Redes Sociais | TikTok | Investimento | Jan.26 | 2026 | 1 | 8384.85
```

## Perfil configurável (não fixo no código)

O perfil `multiplan_regional_sul` fica no banco (`sheet_profiles`) e pode ser editado via API/UI sem redeploy. O código contém apenas **motores de parse** (matricial, tabular).

## Dashboard executivo (na aplicação)

Todas as visões do prompt original estão no **DataInsight** (sem Looker):

- Regional Sul · Comparativo PKB/BSS/PCN · Temporal · Mídia · Social · Shopping · Multi
- Export CSV da base consolidada
- Apresentações PPTX/PDF
