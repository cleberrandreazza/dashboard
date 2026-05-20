/** URL do deployment Convex (definida no build da Vercel via VITE_CONVEX_URL) */
export function getConvexUrl(): string {
  const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (!url || !url.startsWith("https://")) {
    throw new Error(
      "VITE_CONVEX_URL não configurada. Na Vercel, adicione a variável de ambiente do deployment de produção do Convex e faça redeploy."
    );
  }
  return url;
}

export function isConvexConfigured(): boolean {
  const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
  return !!url && url.startsWith("https://");
}
