import type {
  ChartSeriesPoint,
  DashboardKpi,
  DashboardSnapshot,
  InsightItem,
} from "../types";
import type { MultiplanRecord } from "./types";
import { METRIC_PATTERNS } from "./metricCatalog";
import {
  buildMediaChannelStats,
  type MediaChannelStat,
} from "./mediaChannels";

export type CompareGranularity = "month" | "quarter" | "year";

export interface PeriodComparison {
  metricKey: string;
  currentLabel: string;
  previousLabel: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
}

export interface ExecutiveAnalytics extends DashboardSnapshot {
  compareGranularity: CompareGranularity;
  periodComparisons: PeriodComparison[];
  yoyComparisons: PeriodComparison[];
  seasonality: ChartSeriesPoint[];
  quarterlySeries: ChartSeriesPoint[];
  annualSeries: ChartSeriesPoint[];
  rankings: {
    shoppings: ChartSeriesPoint[];
    channels: ChartSeriesPoint[];
  };
  benchmarking: {
    shoppingShare: ChartSeriesPoint[];
    channelShare: ChartSeriesPoint[];
  };
  mediaPlatforms: ChartSeriesPoint[];
  /** Instagram, TikTok, Meta e Google — investimento e publicações */
  mediaChannels: MediaChannelStat[];
  socialPlatforms: ChartSeriesPoint[];
  creators: ChartSeriesPoint[];
}

function num(r: MultiplanRecord): number | null {
  if (typeof r.value === "number") return r.value;
  if (r.value === null) return null;
  const n = Number(String(r.value).replace(/[^\d.-]/g, ""));
  return Number.isNaN(n) ? null : n;
}

function monthKey(r: MultiplanRecord): string {
  return `${r.year}-${String(r.month).padStart(2, "0")}`;
}

function quarterKey(r: MultiplanRecord): string {
  const q = Math.ceil(r.month / 3);
  return `${r.year}-Q${q}`;
}

function yearKey(r: MultiplanRecord): string {
  return String(r.year);
}

function periodKeyFor(
  r: MultiplanRecord,
  granularity: CompareGranularity
): string {
  if (granularity === "year") return yearKey(r);
  if (granularity === "quarter") return quarterKey(r);
  return monthKey(r);
}

function sumByMetric(
  records: MultiplanRecord[],
  metricKey: string
): number {
  const pattern = METRIC_PATTERNS[metricKey]?.pattern;
  if (!pattern) return 0;
  return records
    .filter((r) => pattern.test(r.metric_name))
    .reduce((a, r) => a + (num(r) ?? 0), 0);
}

function aggregateByPeriod(
  records: MultiplanRecord[],
  metricKey: string,
  granularity: CompareGranularity
): Map<string, number> {
  const pattern = METRIC_PATTERNS[metricKey]?.pattern;
  if (!pattern) return new Map();
  const map = new Map<string, number>();
  for (const r of records) {
    if (!pattern.test(r.metric_name)) continue;
    const v = num(r);
    if (v === null) continue;
    const key = periodKeyFor(r, granularity);
    map.set(key, (map.get(key) ?? 0) + v);
  }
  return map;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function buildComparison(
  map: Map<string, number>,
  metricKey: string,
  offset = 1
): PeriodComparison | null {
  const periods = [...map.keys()].sort();
  if (periods.length < offset + 1) return null;
  const currentLabel = periods[periods.length - 1];
  const previousLabel = periods[periods.length - 1 - offset];
  const currentValue = map.get(currentLabel) ?? 0;
  const previousValue = map.get(previousLabel) ?? 0;
  return {
    metricKey,
    currentLabel,
    previousLabel,
    currentValue,
    previousValue,
    changePercent: pctChange(currentValue, previousValue),
  };
}

function buildYoyComparison(
  records: MultiplanRecord[],
  metricKey: string,
  granularity: CompareGranularity
): PeriodComparison | null {
  const pattern = METRIC_PATTERNS[metricKey]?.pattern;
  if (!pattern) return null;

  const monthly = new Map<string, number>();
  for (const r of records) {
    if (!pattern.test(r.metric_name)) continue;
    const v = num(r);
    if (v === null) continue;
    monthly.set(monthKey(r), (monthly.get(monthKey(r)) ?? 0) + v);
  }

  const periods = [...monthly.keys()].sort();
  if (periods.length === 0) return null;

  const latest = periods[periods.length - 1];
  const [yStr, mStr] = latest.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const prevYearKey = `${y - 1}-${String(m).padStart(2, "0")}`;

  let currentLabel = latest;
  let previousLabel = prevYearKey;

  if (granularity === "quarter") {
    const q = Math.ceil(m / 3);
    currentLabel = `${y}-Q${q}`;
    previousLabel = `${y - 1}-Q${q}`;
    const qMap = aggregateByPeriod(records, metricKey, "quarter");
    const cv = qMap.get(currentLabel) ?? 0;
    const pv = qMap.get(previousLabel) ?? 0;
    return {
      metricKey,
      currentLabel,
      previousLabel,
      currentValue: cv,
      previousValue: pv,
      changePercent: pctChange(cv, pv),
    };
  }

  if (granularity === "year") {
    currentLabel = String(y);
    previousLabel = String(y - 1);
    const yMap = aggregateByPeriod(records, metricKey, "year");
    const cv = yMap.get(currentLabel) ?? 0;
    const pv = yMap.get(previousLabel) ?? 0;
    return {
      metricKey,
      currentLabel,
      previousLabel,
      currentValue: cv,
      previousValue: pv,
      changePercent: pctChange(cv, pv),
    };
  }

  const cv = monthly.get(latest) ?? 0;
  const pv = monthly.get(prevYearKey) ?? 0;
  if (pv === 0 && cv === 0) return null;
  return {
    metricKey,
    currentLabel: latest,
    previousLabel: prevYearKey,
    currentValue: cv,
    previousValue: pv,
    changePercent: pctChange(cv, pv),
  };
}

function buildSeasonality(
  records: MultiplanRecord[],
  metricKey: string
): ChartSeriesPoint[] {
  const pattern = METRIC_PATTERNS[metricKey]?.pattern;
  if (!pattern) return [];
  const byMonth = new Map<number, number[]>();
  for (const r of records) {
    if (!pattern.test(r.metric_name) || !r.month) continue;
    const v = num(r);
    if (v === null) continue;
    const arr = byMonth.get(r.month) ?? [];
    arr.push(v);
    byMonth.set(r.month, arr);
  }
  const MONTH_LABELS = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return [...byMonth.entries()]
    .sort(([a], [b]) => a - b)
    .map(([month, values]) => ({
      label: MONTH_LABELS[month - 1] ?? String(month),
      value:
        values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1),
    }));
}

function sumByDimension(
  records: MultiplanRecord[],
  metricPattern: RegExp,
  dim: (r: MultiplanRecord) => string
): ChartSeriesPoint[] {
  const map = new Map<string, number>();
  for (const r of records) {
    if (!metricPattern.test(r.metric_name)) continue;
    const v = num(r);
    if (v === null) continue;
    const key = dim(r);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + v);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
}

export interface BuildExecutiveOptions {
  shopping?: string;
  domains?: MultiplanRecord["domain"][];
  compareGranularity?: CompareGranularity;
  /** Foco de comparação quando há filtro de período */
  focusYear?: number;
  focusMonth?: number;
}

const PRIMARY_METRICS = [
  "investimento",
  "alcance",
  "impressoes",
  "sessoes",
  "gmv",
  "leads",
  "engajamento",
] as const;

export function buildExecutiveAnalytics(
  records: MultiplanRecord[],
  options?: BuildExecutiveOptions
): ExecutiveAnalytics {
  const opts = options ?? {};
  const granularity = opts.compareGranularity ?? "month";

  let filtered = records;
  if (opts.shopping) {
    filtered = filtered.filter((r) => r.shopping === opts.shopping);
  }
  if (opts.domains?.length) {
    filtered = filtered.filter((r) => opts.domains!.includes(r.domain));
  }

  const investimento = sumByMetric(filtered, "investimento");
  const impressoes = sumByMetric(filtered, "impressoes");
  const alcance = sumByMetric(filtered, "alcance");
  const seguidores = filtered
    .filter(
      (r) =>
        r.domain === "social_media" &&
        /^seguidores$/i.test(r.metric_name)
    )
    .reduce((a, r) => a + (num(r) ?? 0), 0);
  const sessoes = sumByMetric(filtered, "sessoes");
  const gmv = sumByMetric(filtered, "gmv");
  const leads = sumByMetric(filtered, "leads");
  const engajamento = sumByMetric(filtered, "engajamento");
  const views = sumByMetric(filtered, "views");
  const influenciadores = filtered
    .filter((r) => r.domain === "influencers" || r.domain === "vendors")
    .filter((r) => /investimento|influenciador/i.test(r.metric_name))
    .reduce((a, r) => a + (num(r) ?? 0), 0);

  const investMap = aggregateByPeriod(filtered, "investimento", granularity);
  const periodComparisons: PeriodComparison[] = [];
  const yoyComparisons: PeriodComparison[] = [];

  for (const key of PRIMARY_METRICS) {
    const map = aggregateByPeriod(filtered, key, granularity);
    const cmp = buildComparison(map, key);
    if (cmp) periodComparisons.push(cmp);
    const yoy = buildYoyComparison(filtered, key, granularity);
    if (yoy) yoyComparisons.push(yoy);
  }

  const change = (key: string) =>
    periodComparisons.find((c) => c.metricKey === key)?.changePercent;

  const kpiList: DashboardKpi[] = [
    {
      key: "investimento",
      label: "Investimento total",
      value: investimento,
      format: "currency" as const,
      changePercent: change("investimento"),
    },
    {
      key: "alcance",
      label: "Alcance",
      value: alcance,
      format: "number" as const,
      changePercent: change("alcance"),
    },
    {
      key: "impressoes",
      label: "Impressões",
      value: impressoes,
      format: "number" as const,
      changePercent: change("impressoes"),
    },
    {
      key: "sessoes",
      label: "Sessões",
      value: sessoes,
      format: "number" as const,
      changePercent: change("sessoes"),
    },
    {
      key: "gmv",
      label: "GMV",
      value: gmv,
      format: "currency" as const,
      changePercent: change("gmv"),
    },
    {
      key: "leads",
      label: "Leads",
      value: leads,
      format: "number" as const,
      changePercent: change("leads"),
    },
    {
      key: "engajamento",
      label: "Engajamento",
      value: engajamento,
      format: "number" as const,
      changePercent: change("engajamento"),
    },
    {
      key: "seguidores",
      label: "Seguidores",
      value: seguidores,
      format: "number" as const,
    },
    {
      key: "views",
      label: "Views",
      value: views,
      format: "number" as const,
    },
    {
      key: "influenciadores",
      label: "Invest. creators",
      value: influenciadores,
      format: "currency" as const,
    },
  ];
  const kpis = kpiList.filter((k) => k.value > 0 || k.key === "investimento");

  const timeSeries = [...investMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));

  const quarterlySeries = [
    ...aggregateByPeriod(filtered, "investimento", "quarter").entries(),
  ]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));

  const annualSeries = [
    ...aggregateByPeriod(filtered, "investimento", "year").entries(),
  ]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));

  const byShopping = sumByDimension(
    filtered,
    /investimento/i,
    (r) => r.shopping
  );
  const byPlatform = sumByDimension(
    filtered,
    /investimento/i,
    (r) => r.platform ?? "Outros"
  );

  const totalInvest = byShopping.reduce((a, p) => a + p.value, 0);
  const shoppingShare = byShopping.map((p) => ({
    label: p.label,
    value: totalInvest > 0 ? (p.value / totalInvest) * 100 : 0,
  }));

  const totalPlatform = byPlatform.reduce((a, p) => a + p.value, 0);
  const channelShare = byPlatform.map((p) => ({
    label: p.label,
    value: totalPlatform > 0 ? (p.value / totalPlatform) * 100 : 0,
  }));

  const mediaDomains = ["analytics", "vendors", "social_media"] as const;
  const mediaRecords = filtered.filter((r) =>
    mediaDomains.includes(r.domain as (typeof mediaDomains)[number])
  );
  const mediaChannels = buildMediaChannelStats(mediaRecords);
  const mediaPlatforms = sumByDimension(
    mediaRecords,
    /investimento/i,
    (r) => r.platform ?? r.sheet_name
  );

  const socialRecords = filtered.filter((r) => r.domain === "social_media");
  const socialPlatforms = sumByDimension(
    socialRecords,
    /seguidor|engaj|alcance|view/i,
    (r) => r.platform ?? "Social"
  );

  const creatorRecords = filtered.filter(
    (r) => r.domain === "influencers" || /influenciador/i.test(r.metric_name)
  );
  const creators = sumByDimension(
    creatorRecords,
    /investimento|alcance|engaj|view/i,
    (r) => (r.extra?.influenciador as string) ?? r.platform ?? r.metric_name
  ).slice(0, 10);

  const seasonality = buildSeasonality(filtered, "investimento");

  const insights: InsightItem[] = buildInsights(
    filtered,
    periodComparisons,
    yoyComparisons,
    byShopping,
    opts.shopping
  );

  return {
    kpis,
    timeSeries,
    byCategory: byPlatform.slice(0, 12),
    byRegion: byShopping,
    insights,
    compareGranularity: granularity,
    periodComparisons,
    yoyComparisons,
    seasonality,
    quarterlySeries,
    annualSeries,
    rankings: {
      shoppings: byShopping,
      channels: byPlatform.slice(0, 12),
    },
    benchmarking: {
      shoppingShare,
      channelShare,
    },
    mediaPlatforms: mediaPlatforms.slice(0, 12),
    mediaChannels,
    socialPlatforms: socialPlatforms.slice(0, 8),
    creators,
  };
}

function buildInsights(
  filtered: MultiplanRecord[],
  periodComparisons: PeriodComparison[],
  yoyComparisons: PeriodComparison[],
  byShopping: ChartSeriesPoint[],
  shopping?: string
): InsightItem[] {
  const insights: InsightItem[] = [];

  if (filtered.length > 0) {
    insights.push({
      id: "base-historica",
      type: "summary",
      severity: "info",
      title: "Base histórica contínua",
      description: `${filtered.length.toLocaleString("pt-BR")} registros na tabela única (append mensal por upload).${shopping ? ` Filtro: ${shopping}.` : ""}`,
    });
  }

  const invMom = periodComparisons.find((c) => c.metricKey === "investimento");
  if (invMom) {
    const g = invMom.changePercent;
    insights.push({
      id: "investimento-period",
      type: "trend",
      severity: g < -15 ? "warning" : g > 20 ? "info" : "info",
      title: "Investimento vs período anterior",
      description: `${invMom.currentLabel}: R$ ${invMom.currentValue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} vs ${invMom.previousLabel} (${g >= 0 ? "+" : ""}${g.toFixed(1)}%).`,
      changePercent: g,
      metric: "investimento",
      value: invMom.currentValue,
    });
  }

  const invYoy = yoyComparisons.find((c) => c.metricKey === "investimento");
  if (invYoy && invYoy.previousValue > 0) {
    insights.push({
      id: "investimento-yoy",
      type: "growth",
      severity: invYoy.changePercent < -10 ? "warning" : "info",
      title: "Crescimento YoY — investimento",
      description: `Mesmo período ano anterior (${invYoy.previousLabel}): ${invYoy.changePercent >= 0 ? "+" : ""}${invYoy.changePercent.toFixed(1)}%.`,
      changePercent: invYoy.changePercent,
    });
  }

  if (byShopping.length > 1) {
    const [top, second] = byShopping;
    if (second && second.value > 0) {
      const pct = ((top.value - second.value) / second.value) * 100;
      insights.push({
        id: "benchmark-shopping",
        type: "comparison",
        severity: "info",
        title: "Benchmark entre shoppings",
        description: `${top.label} lidera investimento com ${pct.toFixed(0)}% acima de ${second.label}.`,
        changePercent: pct,
      });
    }
  }

  const alert = periodComparisons.find(
    (c) => c.metricKey === "alcance" && c.changePercent < -20
  );
  if (alert) {
    insights.push({
      id: "alert-alcance",
      type: "alert",
      severity: "warning",
      title: "Alerta: queda de alcance",
      description: `Alcance caiu ${Math.abs(alert.changePercent).toFixed(0)}% vs ${alert.previousLabel}.`,
      changePercent: alert.changePercent,
    });
  }

  return insights;
}

/** Compat: delega ao analytics executivo */
export function buildMultiplanDashboard(
  records: MultiplanRecord[],
  options?: string | BuildExecutiveOptions
): DashboardSnapshot {
  const opts: BuildExecutiveOptions =
    typeof options === "string" ? { shopping: options } : (options ?? {});
  return buildExecutiveAnalytics(records, opts);
}
