/** Padrões de metric_name → chave canônica de KPI */
export const METRIC_PATTERNS: Record<
  string,
  { pattern: RegExp; label: string; format: "number" | "currency" | "percent" }
> = {
  investimento: {
    pattern: /investimento/i,
    label: "Investimento",
    format: "currency",
  },
  impressoes: {
    pattern: /impress/i,
    label: "Impressões",
    format: "number",
  },
  alcance: {
    pattern: /alcance/i,
    label: "Alcance",
    format: "number",
  },
  sessoes: {
    pattern: /sess(ão|oes|ões)?/i,
    label: "Sessões",
    format: "number",
  },
  gmv: {
    pattern: /gmv|vendas totais|receita/i,
    label: "GMV / Vendas",
    format: "currency",
  },
  leads: {
    pattern: /lead/i,
    label: "Leads",
    format: "number",
  },
  engajamento: {
    pattern: /engaj/i,
    label: "Engajamento",
    format: "number",
  },
  seguidores: {
    pattern: /^seguidores$/i,
    label: "Seguidores",
    format: "number",
  },
  cliques: {
    pattern: /clique/i,
    label: "Cliques",
    format: "number",
  },
  views: {
    pattern: /view/i,
    label: "Views",
    format: "number",
  },
  conversoes: {
    pattern: /convers/i,
    label: "Conversões",
    format: "number",
  },
  ctr: { pattern: /\bctr\b/i, label: "CTR", format: "percent" },
  cpc: { pattern: /\bcpc\b/i, label: "CPC", format: "currency" },
  cpm: { pattern: /\bcpm\b/i, label: "CPM", format: "currency" },
};

export const MEDIA_PLATFORMS = [
  "Meta",
  "Facebook",
  "Instagram",
  "TikTok",
  "Google",
  "Programática",
  "Streaming",
  "Uber",
  "Spotify",
  "iFood",
  "YouTube",
  "LinkedIn",
] as const;

export const KNOWN_SHOPPINGS = ["PKB", "BSS", "PCN"] as const;

export function matchMetricKey(metricName: string): string | null {
  for (const [key, { pattern }] of Object.entries(METRIC_PATTERNS)) {
    if (pattern.test(metricName)) return key;
  }
  return null;
}
