# DataInsight — Arquitetura do Sistema

## Visão geral

SaaS de analytics que ingere planilhas Excel não padronizadas, normaliza dados via ETL inteligente, persiste no Convex e expõe dashboards reativos com geração automática de insights e apresentações executivas.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                          │
│  Upload UI │ Dashboard │ Apresentações │ Auth │ Zustand │ React Query   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Convex Client (WebSocket)
┌───────────────────────────────▼─────────────────────────────────────────┐
│                         CONVEX BACKEND                                   │
│  Auth │ File Storage │ Queries │ Mutations │ Actions (Node + SheetJS) │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
   uploads              normalized_records        dashboards
   spreadsheets         mappings                  presentations
   worksheets             audit_logs
```

## Camadas

### 1. Ingestão (`uploads`)

- Drag-and-drop com preview local (parser em `shared/parser.ts`)
- Upload para Convex File Storage via URL assinada
- Registro em `uploads` com status: `pending` → `processing` → `completed` | `failed`
- Action `processing.processUpload` agendada automaticamente

### 2. Motor de leitura inteligente (`shared/`)

| Módulo | Responsabilidade |
|--------|------------------|
| `parser.ts` | Detecta linha de cabeçalho, início dos dados, abas válidas |
| `columnMapper.ts` | Fuzzy match + sinônimos → campos canônicos |
| `etl.ts` | Limpeza, tipos, deduplicação, normalização |
| `insights.ts` | KPIs, tendências, anomalias, comparativos |

**Campos canônicos:** `customer_name`, `product_name`, `amount`, `date`, `region`, etc.

**Extensibilidade IA:** substituir ou complementar `columnMapper.ts` por chamada a LLM/embedding no action Node, mantendo a mesma interface `ColumnMapping[]`.

### 3. Pipeline ETL

```
Excel → Parse → Map Columns → Normalize → Dedupe → Persist → Dashboard Snapshot
```

Versionamento via campo `version` em `uploads`, `mappings` e `normalized_records`.

### 4. Modelo de dados (Convex)

| Tabela | Propósito |
|--------|-----------|
| `users` | Auth (authTables) |
| `uploads` | Metadados do arquivo + storageId |
| `spreadsheets` | Workbook processado |
| `worksheets` | Abas individuais |
| `mappings` | Mapeamento coluna → campo canônico |
| `normalized_records` | Linhas normalizadas (record flexível) |
| `dashboards` | Snapshots: KPIs, séries, insights |
| `presentations` | Metadados + storage do PPTX/PDF |
| `audit_logs` | Auditoria de ações |

### 5. Dashboard

Tipos: `global`, `upload`, `comparative`, `temporal`

- KPIs, Recharts (linha, barra, pizza)
- Filtros via Zustand + busca em `records.search`
- Drill-down por upload selecionado

### 6. Apresentações

Geração client-side com `pptxgenjs` e `pdf-lib`:

- Capa, resumo executivo, KPIs, insights, conclusões
- Upload do blob para storage + registro em `presentations`

### 7. Segurança

- Convex Auth (Password) em todas as queries/mutations públicas
- `assertOwnership` em recursos por `userId`
- File URLs assinadas via `ctx.storage.getUrl`

## Escalabilidade

- **Paginação:** trocar `.take(500)` por cursor em `normalized_records` para datasets grandes
- **Batch inserts:** processar em chunks maiores via `internalMutation` dedicada
- **IA:** endpoint action com OpenAI/Anthropic para mapeamento semântico de colunas
- **Comparativo/temporal:** agregar múltiplos `uploadId` em queries dedicadas

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19, Vite, Tailwind 4, shadcn-style UI, Recharts, Zustand, TanStack Query |
| Backend | Convex, TypeScript, Convex Auth, File Storage |
| Excel | SheetJS (xlsx) |
| Export | pptxgenjs, pdf-lib |
