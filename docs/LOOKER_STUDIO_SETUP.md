# Conectar DataInsight ao Looker Studio

O DataInsight exporta a **base histórica contínua** em formato longo (tidy), otimizado para BI no Looker Studio.

## Colunas do export

| Coluna | Uso no Looker |
|--------|----------------|
| `date` | Dimensão de data (tipo Date) |
| `period_key` | Filtro `YYYY-MM` |
| `year`, `month`, `quarter` | Dimensões temporais |
| `shopping` | PKB, BSS, PCN |
| `domain_label` | Mídia, Social, CRM, etc. |
| `platform` | Meta, TikTok, Google… |
| `metric_name` / `metric_key` | Métricas |
| `value_numeric` | Métrica principal (SUM, AVG) |
| `campaign`, `category` | Quebras adicionais |

## Fluxo recomendado

### Opção A — CSV → Google Sheets → Looker Studio

1. No DataInsight: **Export Looker** → **CSV para Looker Studio**.
2. Abra [Google Sheets](https://sheets.google.com) → Arquivo → Importar → Upload do CSV.
3. No [Looker Studio](https://lookerstudio.google.com): **Criar** → **Fonte de dados** → **Google Sheets**.
4. Selecione a planilha importada.
5. Edite o esquema:
   - `date` → tipo **Data** (YYYY-MM-DD)
   - `value_numeric` → tipo **Número**
6. Crie relatórios com dimensões `shopping`, `platform`, `domain_label` e métrica `SUM(value_numeric)`.

### Opção B — Snapshot na nuvem → Drive

1. **Export Looker** → **Gerar snapshot** (CSV).
2. Baixe o link gerado e envie para o Google Drive.
3. Looker Studio → **Google Drive** como fonte.

### Opção C — Atualização mensal (append)

1. Cada mês: novo upload no DataInsight (append na base).
2. Reexporte o CSV completo ou filtrado por ano.
3. Substitua os dados na planilha Google Sheets (ou use aba nova + UNION no Looker).

## Modelagem sugerida no Looker

### Visão regional
- Dimensão: `shopping`
- Métrica: `SUM(value_numeric)` com filtro `metric_key = investimento`
- Gráfico temporal: `date` × investimento

### Benchmark shoppings
- Gráfico de barras: `shopping` × investimento
- Filtro global: `year`, `month`

### Mídia por canal
- Dimensão: `platform`
- Filtro: `domain_label` contém "Mídia" ou `domain` = analytics / vendors

### YoY / MoM
- Use `period_key` ou campos calculados no Looker:
  - `year` para comparativo anual
  - `month` + `year` para sazonalidade

## Limites

- Download direto no navegador: até **50.000** linhas por export.
- Snapshot na nuvem: mesmo limite; para bases maiores, use filtros (ano/shopping) e múltiplos exports.

## Looker (Google Cloud core)

Para **Looker** enterprise (não Looker Studio), importe o CSV/JSON para **BigQuery** e aponte o Looker ao dataset `multiplan_regional_sul`.

```bash
# Exemplo: bq load após export CSV
bq load --source_format=CSV --autodetect \
  projeto:dataset.multiplan_metrics \
  ./looker-multiplan-completo-2026-05-20.csv
```

## Suporte

Dúvidas sobre colunas ou métricas: ver `docs/HISTORICAL_STRUCTURE.md` e `docs/OPERATIONAL_MANUAL.md`.
