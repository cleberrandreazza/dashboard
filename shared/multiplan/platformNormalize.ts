const PLATFORM_MAP: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  meta: "Meta Ads",
  youtube: "YouTube",
  gmn: "GMN",
  analytics: "Analytics",
  buzzmonitor: "Buzzmonitor",
  multi: "Multi",
  multivc: "MultiVC",
  spotify: "Spotify",
  uber: "Uber",
  ifood: "iFood",
  google: "Google Ads",
  programatica: "Programática",
  programática: "Programática",
  crm: "CRM",
  site: "Site",
};

export function normalizePlatform(name: string): string {
  const key = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

  if (PLATFORM_MAP[key]) return PLATFORM_MAP[key];

  const upper = name.trim().toUpperCase();
  if (upper === "TIKTOK") return "TikTok";
  if (upper === "INSTAGRAM") return "Instagram";
  if (upper === "FACEBOOK") return "Facebook";
  if (upper === "YOUTUBE") return "YouTube";

  return name.trim() || "Desconhecido";
}

export function applyAliases(
  name: string,
  aliases?: Record<string, string>
): string {
  const normalized = normalizePlatform(name);
  if (!aliases) return normalized;
  const key = name.trim().toLowerCase();
  return aliases[key] ?? aliases[normalized] ?? normalized;
}

export function extractShoppingFromFileName(
  fileName: string,
  regexSource = "(PKB|BSS|PCN)"
): string | null {
  const re = new RegExp(regexSource, "i");
  const m = fileName.match(re);
  return m ? m[1].toUpperCase() : null;
}
