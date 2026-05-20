import { isConvexConfigured, getConvexUrl } from "@/lib/convex-env";

export function EnvConfigBanner() {
  if (import.meta.env.DEV && isConvexConfigured()) return null;

  if (!isConvexConfigured()) {
    return (
      <div className="bg-destructive text-destructive-foreground px-4 py-3 text-sm text-center">
        <strong>VITE_CONVEX_URL</strong> não está definida. Configure na Vercel
        (Settings → Environment Variables) com a URL de produção do Convex e
        redeploy.
      </div>
    );
  }

  if (!import.meta.env.DEV) {
    const url = getConvexUrl();
    if (url.includes("vibrant-roadrunner")) {
      return (
        <div className="bg-amber-500/90 text-black px-4 py-2 text-xs text-center">
          Atenção: o build aponta para o deployment de <strong>desenvolvimento</strong>{" "}
          do Convex. Use <code className="bg-black/10 px-1 rounded">tidy-wolverine-260</code>{" "}
          em produção na Vercel.
        </div>
      );
    }
  }

  return null;
}
