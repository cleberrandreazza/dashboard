import type { ColumnMapping, ParsedRow, ParsedSheet } from "./types";

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const cleaned = String(value)
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
}

function parseDate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && value > 30000 && value < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    return excelEpoch.getTime() + value * 86400000;
  }
  const ts = Date.parse(String(value));
  return Number.isNaN(ts) ? null : ts;
}

function normalizeValue(
  value: unknown,
  mapping: ColumnMapping
): unknown {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (str === "") return null;

  switch (mapping.dataType) {
    case "number":
    case "currency":
      return parseNumber(value);
    case "date":
      return parseDate(value);
    case "boolean":
      return ["sim", "yes", "true", "1", "s"].includes(str.toLowerCase());
    default:
      return str;
  }
}

export function normalizeRow(
  raw: Record<string, unknown>,
  mappings: ColumnMapping[]
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  const mappingBySource = new Map(mappings.map((m) => [m.sourceColumn, m]));

  for (const [key, value] of Object.entries(raw)) {
    const mapping = mappingBySource.get(key);
    if (!mapping || mapping.canonicalField === "unknown") continue;
    normalized[mapping.canonicalField] = normalizeValue(value, mapping);
  }
  return normalized;
}

export function runEtlPipeline(sheet: ParsedSheet): ParsedSheet {
  const seen = new Set<string>();
  const dedupedRows: ParsedRow[] = [];

  for (const row of sheet.rows) {
    const normalized = normalizeRow(row.raw, sheet.mappings);
    row.normalized = normalized;

    const fingerprint = JSON.stringify(normalized);
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    dedupedRows.push(row);
  }

  return { ...sheet, rows: dedupedRows };
}

export function runWorkbookEtl(
  sheets: ParsedSheet[]
): ParsedSheet[] {
  return sheets.map(runEtlPipeline);
}
