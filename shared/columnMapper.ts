import { FIELD_SYNONYMS, CANONICAL_FIELDS } from "./canonicalFields";
import type { CanonicalField, ColumnMapping, DataType } from "./types";

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  return 1 - levenshtein(a, b) / maxLen;
}

function inferDataType(samples: unknown[]): DataType {
  const values = samples.filter((v) => v !== null && v !== undefined && v !== "");
  if (values.length === 0) return "unknown";

  const numeric = values.filter((v) => {
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
    return !Number.isNaN(n) && String(v).trim() !== "";
  });
  if (numeric.length / values.length > 0.8) return "number";

  const dateLike = values.filter((v) => {
    const s = String(v);
    return !Number.isNaN(Date.parse(s)) || /^\d{1,2}[\/\-]\d{1,2}/.test(s);
  });
  if (dateLike.length / values.length > 0.6) return "date";

  return "string";
}

export function mapColumn(
  header: string,
  sampleValues: unknown[] = []
): ColumnMapping {
  const normalized = normalizeHeader(header);
  let bestField: CanonicalField = "unknown";
  let bestScore = 0;

  for (const field of CANONICAL_FIELDS) {
    const synonyms = FIELD_SYNONYMS[field];
    for (const syn of synonyms) {
      const synNorm = normalizeHeader(syn);
      const exact = normalized === synNorm ? 1 : 0;
      const contains =
        normalized.includes(synNorm) || synNorm.includes(normalized) ? 0.85 : 0;
      const fuzzy = similarity(normalized, synNorm);
      const score = Math.max(exact, contains, fuzzy * 0.9);
      if (score > bestScore) {
        bestScore = score;
        bestField = field;
      }
    }
  }

  const confidence = bestScore >= 0.5 ? bestScore : 0;
  const canonicalField = confidence > 0 ? bestField : "unknown";

  return {
    sourceColumn: header,
    canonicalField,
    confidence: Math.round(confidence * 100) / 100,
    dataType: inferDataType(sampleValues),
  };
}

export function mapColumns(
  headers: string[],
  rows: Record<string, unknown>[]
): ColumnMapping[] {
  return headers.map((header) => {
    const samples = rows.slice(0, 50).map((r) => r[header]);
    return mapColumn(header, samples);
  });
}
