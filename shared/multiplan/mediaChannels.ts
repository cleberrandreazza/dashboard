import type { MultiplanRecord } from "./types";
import { METRIC_PATTERNS } from "./metricCatalog";

export type MediaChannelId = "instagram" | "tiktok" | "meta" | "google";

export interface MediaChannelStat {
  id: MediaChannelId;
  label: string;
  investment: number;
  publications: number;
}

const CHANNEL_ORDER: MediaChannelId[] = [
  "instagram",
  "tiktok",
  "meta",
  "google",
];

const CHANNEL_LABELS: Record<MediaChannelId, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  meta: "Meta",
  google: "Google",
};

const MEDIA_DOMAINS = new Set<MultiplanRecord["domain"]>([
  "analytics",
  "vendors",
  "social_media",
]);

/** Métricas de quantidade de publicações nas planilhas */
const PUBLICATION_PATTERN =
  /publica(ç|c)(õ|o)es?|posts?|peças?\s*(publicadas|criadas)?|qtd\.?\s*publica|quantidade\s*(de\s*)?publica|n[º°]\s*publica|conteúdos?\s*publicados?|conteudos?\s*publicados?/i;

function num(r: MultiplanRecord): number | null {
  if (typeof r.value === "number") return r.value;
  if (r.value === null) return null;
  const n = Number(String(r.value).replace(/[^\d.-]/g, ""));
  return Number.isNaN(n) ? null : n;
}

function normalizeKey(platform: string): string {
  return platform
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function resolveMediaChannel(platform: string): MediaChannelId | null {
  const key = normalizeKey(platform);
  if (!key) return null;

  if (/instagram|insta|^ig$/.test(key)) return "instagram";
  if (/tiktok|^tt$/.test(key)) return "tiktok";
  if (/meta|facebook|^fb$/.test(key)) return "meta";
  if (/google|gads|g ads/.test(key)) return "google";

  return null;
}

export function buildMediaChannelStats(
  records: MultiplanRecord[]
): MediaChannelStat[] {
  const totals: Record<MediaChannelId, { investment: number; publications: number }> =
    {
      instagram: { investment: 0, publications: 0 },
      tiktok: { investment: 0, publications: 0 },
      meta: { investment: 0, publications: 0 },
      google: { investment: 0, publications: 0 },
    };

  const investPattern = METRIC_PATTERNS.investimento.pattern;

  for (const r of records) {
    if (!MEDIA_DOMAINS.has(r.domain)) continue;

    const channel = resolveMediaChannel(r.platform ?? r.sheet_name);
    if (!channel) continue;

    const value = num(r);
    if (value === null || value <= 0) continue;

    if (investPattern.test(r.metric_name)) {
      totals[channel].investment += value;
    } else if (PUBLICATION_PATTERN.test(r.metric_name)) {
      totals[channel].publications += value;
    }
  }

  return CHANNEL_ORDER.map((id) => ({
    id,
    label: CHANNEL_LABELS[id],
    investment: totals[id].investment,
    publications: totals[id].publications,
  }));
}
