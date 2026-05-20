import type { MultiplanRecord } from "../multiplan/types";
import { matchMetricKey } from "../multiplan/metricCatalog";
import type { PeriodFilter } from "../multiplan/filters";
import { filterRecords } from "../multiplan/filters";

/** Linha no formato longo recomendado para Looker Studio / Looker */
export interface LookerRow {
  /** Data no formato ISO (YYYY-MM-DD) — dimensão de data principal */
  date: string;
  period_key: string;
  year: number;
  month: number;
  quarter: number;
  year_month: string;
  shopping: string;
  domain: string;
  domain_label: string;
  sheet_name: string;
  platform: string;
  metric_name: string;
  metric_key: string;
  value_numeric: number | null;
  value_text: string;
  value_type: string;
  period_label: string;
  /** Campanha / influenciador quando disponível no extra */
  campaign: string;
  category: string;
}

const DOMAIN_LABELS: Record<string, string> = {
  social_media: "Social Media",
  analytics: "Analytics / Mídia",
  multi_app: "CRM / Multi App",
  shopping: "Shopping",
  influencers: "Influenciadores",
  vendors: "Fornecedores / Mídia",
  venue: "Venue / Experiência",
  insights: "Insights Executivos",
  unknown: "Outros",
};

function parseNumeric(value: MultiplanRecord["value"]): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value === null || value === undefined) return null;
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isNaN(n) ? null : n;
}

function padMonth(m: number): string {
  return String(m).padStart(2, "0");
}

export function toLookerRow(r: MultiplanRecord): LookerRow {
  const year = r.year || 0;
  const month = r.month || 0;
  const quarter = month ? Math.ceil(month / 3) : 0;
  const period_key = year && month ? `${year}-${padMonth(month)}` : "";
  const date =
    year && month ? `${year}-${padMonth(month)}-01` : "";

  const extra = r.extra ?? {};
  const campaign =
    String(extra.campanha ?? extra.campaign ?? extra.influenciador ?? "") ||
    "";
  const category = String(extra.categoria ?? extra.category ?? "") || "";

  const value_numeric = parseNumeric(r.value);
  const value_text =
    r.value === null || r.value === undefined ? "" : String(r.value);

  return {
    date,
    period_key,
    year,
    month,
    quarter,
    year_month: period_key,
    shopping: r.shopping,
    domain: r.domain,
    domain_label: DOMAIN_LABELS[r.domain] ?? r.domain,
    sheet_name: r.sheet_name,
    platform: r.platform ?? "",
    metric_name: r.metric_name,
    metric_key: matchMetricKey(r.metric_name) ?? "other",
    value_numeric,
    value_text,
    value_type: r.value_type,
    period_label: r.period_label,
    campaign,
    category,
  };
}

export function buildLookerDataset(
  records: MultiplanRecord[],
  filter?: PeriodFilter
): LookerRow[] {
  const filtered = filter ? filterRecords(records, filter) : records;
  return filtered.map(toLookerRow);
}

/** Colunas na ordem recomendada para importação no Looker Studio */
export const LOOKER_CSV_COLUMNS: (keyof LookerRow)[] = [
  "date",
  "period_key",
  "year",
  "month",
  "quarter",
  "year_month",
  "shopping",
  "domain",
  "domain_label",
  "sheet_name",
  "platform",
  "metric_name",
  "metric_key",
  "value_numeric",
  "value_text",
  "value_type",
  "period_label",
  "campaign",
  "category",
];

export const LOOKER_SCHEMA_DESCRIPTION = {
  name: "multiplan_regional_sul",
  description:
    "Base histórica contínua Multiplan (PKB, BSS, PCN). Formato longo: uma linha por métrica × período.",
  recommendedConnector: "Google Sheets ou upload CSV no Looker Studio",
  dateField: "date",
  primaryKeys: ["shopping", "period_key", "metric_name", "platform", "sheet_name"],
};
