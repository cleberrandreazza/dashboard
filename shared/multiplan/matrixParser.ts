import { parsePeriodLabel, isPeriodHeader } from "./monthParser";
import { normalizePlatform, applyAliases } from "./platformNormalize";
import type { DataDomain, MultiplanRecord } from "./types";

function parseValue(cell: unknown): {
  value: number | string | null;
  value_type: "number" | "currency" | "text";
} {
  if (cell === null || cell === undefined || cell === "") {
    return { value: null, value_type: "text" };
  }
  if (typeof cell === "number") {
    return { value: cell, value_type: "number" };
  }
  const s = String(cell).trim();
  if (s === "-" || s === "—") return { value: null, value_type: "text" };

  const currencyMatch = s.match(/R\$\s*([\d.,]+)/i);
  if (currencyMatch) {
    const n = Number(
      currencyMatch[1].replace(/\./g, "").replace(",", ".")
    );
    return { value: Number.isNaN(n) ? null : n, value_type: "currency" };
  }

  const cleaned = s.replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isNaN(n) && /^[\d.,\s]+$/.test(s.replace(/R\$/gi, "").trim())) {
    return { value: n, value_type: "number" };
  }

  return { value: s, value_type: "text" };
}

function findPeriodColumns(
  row: unknown[],
  startCol = 0
): { colIndex: number; period: NonNullable<ReturnType<typeof parsePeriodLabel>> }[] {
  const periods: {
    colIndex: number;
    period: NonNullable<ReturnType<typeof parsePeriodLabel>>;
  }[] = [];
  for (let c = startCol; c < row.length; c++) {
    const p = parsePeriodLabel(String(row[c] ?? ""));
    if (p) periods.push({ colIndex: c, period: p });
  }
  return periods;
}

const KNOWN_PLATFORMS = [
  "TIKTOK",
  "INSTAGRAM",
  "FACEBOOK",
  "YOUTUBE",
  "ANALYTICS",
  "GMN",
  "BUZZMONITOR",
  "MULTI",
  "MULTIVC",
];

function detectPlatformInCell(cell: unknown): string | null {
  const s = String(cell ?? "").trim();
  if (!s || s.length > 40 || s.includes("\n")) return null;
  const upper = s.toUpperCase();
  if (KNOWN_PLATFORMS.some((p) => upper === p || upper.startsWith(p + " "))) {
    return normalizePlatform(s.split(/[\s,]/)[0]);
  }
  return null;
}

interface BlockContext {
  platform: string | null;
  section: string | null;
  periodCols: { colIndex: number; period: NonNullable<ReturnType<typeof parsePeriodLabel>> }[];
  metricCol: number;
}

/**
 * Parser para abas matriciais Multiplan (métricas × meses).
 * Suporta layout PKB/BSS (col B = rótulo) e PCN (col A = rótulo).
 */
export function parseMatrixSheet(
  matrix: unknown[][],
  args: {
    shopping: string;
    sheetName: string;
    domain: DataDomain;
    aliases?: Record<string, string>;
  }
): MultiplanRecord[] {
  const records: MultiplanRecord[] = [];
  let ctx: BlockContext = {
    platform: null,
    section: args.sheetName,
    periodCols: [],
    metricCol: 1,
  };

  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] ?? [];

    // Cabeçalho de meses na linha 0 (Shopping / Fornecedores)
    const rowPeriods = findPeriodColumns(row, 0);
    if (
      rowPeriods.length >= 3 &&
      !detectPlatformInCell(row[0]) &&
      !detectPlatformInCell(row[1])
    ) {
      const labelCell = String(row[0] ?? "").trim();
      if (labelCell && !isPeriodHeader(labelCell)) {
        ctx.section = labelCell;
      }
      ctx.platform = null;
      ctx.periodCols = rowPeriods;
      ctx.metricCol = 0;
      continue;
    }

    // Bloco de plataforma: TIKTOK | INSTAGRAM | etc.
    const platA = detectPlatformInCell(row[0]);
    const platB = detectPlatformInCell(row[1]);
    if (platA || platB) {
      ctx.platform = applyAliases(platA ?? platB!, args.aliases);
      const periodsFromB = findPeriodColumns(row, platA ? 1 : 2);
      const periodsFromC = findPeriodColumns(row, 2);
      ctx.periodCols =
        periodsFromB.length >= periodsFromC.length
          ? periodsFromB
          : periodsFromC;
      ctx.metricCol = platA ? 0 : 1;
      continue;
    }

    if (ctx.periodCols.length === 0) continue;

    const metricName = String(row[ctx.metricCol] ?? row[0] ?? "").trim();
    if (!metricName) continue;
    if (metricName.toLowerCase().includes("resumo mês")) continue;
    if (metricName.startsWith("*")) continue;
    if (isPeriodHeader(metricName)) continue;

    for (const { colIndex, period } of ctx.periodCols) {
      if (colIndex === ctx.metricCol) continue;
      const { value, value_type } = parseValue(row[colIndex]);
      if (value === null && value_type === "text") continue;
      if (typeof value === "string" && isPeriodHeader(value)) continue;

      records.push({
        shopping: args.shopping,
        domain: args.domain,
        sheet_name: args.sheetName,
        platform: ctx.platform ?? ctx.section,
        metric_name: metricName,
        period_label: period.label,
        year: period.year,
        month: period.month,
        value,
        value_type,
        source_row: r,
        source_col: colIndex,
      });
    }
  }

  return records;
}
