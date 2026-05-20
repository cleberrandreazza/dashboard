# Deploy na Vercel — DataInsight

O frontend (Vite/React) vai para a **Vercel**. O backend fica no **Convex Cloud** (deploy separado).

## 1. Deploy do Convex (produção)

No terminal, na pasta do projeto:

```bash
npx convex deploy
```

Anote as URLs de **produção** (exemplo do seu projeto):

- `https://tidy-wolverine-260.convex.cloud`
- `https://tidy-wolverine-260.convex.site`

## 2. Auth no Convex (produção)

Substitua pela URL final da Vercel (ex.: `https://dashboard-xxx.vercel.app`):

```bash
npx @convex-dev/auth --web-server-url https://SEU-APP.vercel.app
```

Quando o CLI perguntar, escolha o deployment de **produção**.

Ou configure manualmente no [Convex Dashboard](https://dashboard.convex.dev) → deployment **prod** → **Settings** → **Environment Variables**:

| Variável | Valor |
|----------|--------|
| `SITE_URL` | `https://SEU-APP.vercel.app` |
| `JWT_PRIVATE_KEY` | (copiar do dev ou gerar com o comando acima) |
| `JWKS` | (idem) |
| `CONVEX_SITE_URL` | `https://tidy-wolverine-260.convex.site` |

## 3. Variáveis na Vercel

**Project → Settings → Environment Variables** (Production):

| Nome | Valor |
|------|--------|
| `VITE_CONVEX_URL` | `https://tidy-wolverine-260.convex.cloud` |
| `VITE_CONVEX_SITE_URL` | `https://tidy-wolverine-260.convex.site` |

Marque **Production** (e Preview se quiser o mesmo backend).

## 4. Deploy na Vercel

### Opção A — CLI (recomendado)

```bash
npm i -g vercel
vercel login
vercel
```

Na primeira vez: confirme o projeto, framework **Vite**, build `npm run build`, output `dist`.

Produção:

```bash
vercel --prod
```

### Opção B — GitHub + Vercel

1. Suba o código para um repositório GitHub.
2. [vercel.com/new](https://vercel.com/new) → Import repository.
3. Framework: **Vite** (detectado automaticamente via `vercel.json`).
4. Adicione as variáveis `VITE_CONVEX_*`.
5. Deploy.

## 5. Após o deploy

1. Copie a URL da Vercel (ex. `https://datainsight.vercel.app`).
2. Atualize `SITE_URL` no Convex **prod** com essa URL exata.
3. Rode de novo o auth se necessário:

```bash
npx @convex-dev/auth --web-server-url https://SUA-URL.vercel.app
```

4. Teste login, upload e dashboard na URL pública.

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Página 404 ao atualizar rota | `vercel.json` já inclui rewrite SPA |
| Login falha em produção | `SITE_URL` no Convex prod = URL da Vercel |
| Dados vazios | `VITE_CONVEX_URL` apontando para **prod**, não dev |
| Build falha na Vercel | Rode `npm run build` localmente e corrija erros TS |

## Arquivos do projeto

- `vercel.json` — build Vite + rotas React Router
- `.env.production.example` — referência das variáveis
