# DataInsight — Multiplan Regional Sul

Plataforma SaaS para upload de planilhas Excel operacionais (PKB, BSS, PCN), normalização inteligente (ETL), **dashboard executivo integrado** e geração automática de apresentações (PPTX/PDF).

> **Escopo:** todo analytics e BI ficam **nesta aplicação**. Não há integração com Looker Studio.

## Stack

- **Frontend:** React, TypeScript, Vite, TailwindCSS, Recharts, Zustand, React Query
- **Backend:** Convex, Convex Auth, File Storage
- **Excel:** SheetJS + parser Multiplan (matricial + tabular)
- **Apresentações:** pptxgenjs, pdf-lib

## Início rápido (local)

```bash
npm install
npx convex dev          # terminal 1
npm run dev             # terminal 2 → http://localhost:5173
```

Auth: `npx @convex-dev/auth --web-server-url http://localhost:5173`

## Deploy na Vercel

1. `npx convex deploy` (backend produção)
2. Variáveis `VITE_CONVEX_URL` e `VITE_CONVEX_SITE_URL` na Vercel
3. `vercel --prod` ou importar repositório na Vercel

Guia completo: [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)

## Fluxo operacional (prompt original)

```
Planilhas Excel (upload)
    → Perfil configurável (sheet_profiles)
    → Parser Multiplan (unpivot métricas × meses)
    → Base histórica no Convex (append por upload)
    → Dashboard executivo (7 visões)
    → Insights automáticos
    → Apresentações PPTX/PDF
    → Export CSV da base consolidada
```

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| **Uploads** | Drag-and-drop, preview, PKB/BSS/PCN automático |
| **Dashboard** | Regional, por shopping, evolução histórica (MoM/QoQ/YoY/sazonalidade), mídia, social, executivo, CRM |
| **Apresentações** | Relatório executivo PPTX/PDF |
| **Perfis** | Regras de abas editáveis no banco (não no código) |
| **Export** | CSV da base histórica consolidada |
| **Looker** | Export CSV/JSON otimizado para Looker Studio + snapshots na nuvem |

## Estrutura

```
convex/          Backend + processamento
shared/multiplan/ Parser e insights Multiplan
src/             Frontend React
docs/            Arquitetura e diagnóstico das planilhas
```

## Estrutura histórica e dashboard

- Base única com **append mensal** (ver `docs/HISTORICAL_STRUCTURE.md`)
- Comparativos **mensal / trimestral / anual**, **YoY**, **sazonalidade**, **benchmark** shoppings e canais
- Manual do analista: `docs/OPERATIONAL_MANUAL.md`
- BI **in-app** + exportação para **Looker Studio** (`/looker`, ver `docs/LOOKER_STUDIO_SETUP.md`)

## Roadmap (sem Looker)

- [x] Editor visual de perfis (CRUD completo)
- [x] Filtros por período (ano/mês/trimestre/shopping) no dashboard
- [x] Estrutura histórica contínua + comparativos executivos
- [ ] IA para mapeamento semântico de colunas novas
- [ ] Alertas configuráveis (limiar MoM customizável)
