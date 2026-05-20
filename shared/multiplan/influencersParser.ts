import type { MultiplanRecord } from "./types";

/** Parser para aba Influs — estrutura tabular TikTok + Instagram lado a lado */
export function parseInfluencersSheet(
  matrix: unknown[][],
  args: { shopping: string; sheetName: string }
): MultiplanRecord[] {
  const records: MultiplanRecord[] = [];
  if (matrix.length < 2) return records;

  const header = matrix[0] ?? [];
  const h1 = matrix[1] ?? [];

  // Detectar split Instagram (coluna ~10)
  let igStart = -1;
  for (let c = 0; c < header.length; c++) {
    if (String(header[c] ?? "").toLowerCase().includes("instagram")) {
      igStart = c;
      break;
    }
  }
  if (igStart < 0) {
    for (let c = 0; c < h1.length; c++) {
      if (String(h1[c] ?? "").toLowerCase().includes("instagram")) {
        igStart = c;
        break;
      }
    }
  }

  const dataStart = h1.some((c) => String(c).toLowerCase() === "squad") ? 2 : 1;

  for (let r = dataStart; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const col0 = String(row[0] ?? "").trim();

    // Formato PKB/BSS: col0 = JAN/FEV, col8 = squad name
    const isPeriodRow = /^(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)$/i.test(col0);
    const squad = isPeriodRow
      ? String(row[8] ?? row[1] ?? "").trim()
      : String(row[0] ?? "").trim();
    const assunto = isPeriodRow
      ? String(row[1] ?? "").trim()
      : String(row[1] ?? "").trim();

    if (!squad && !assunto) continue;

    const periodMap: Record<string, number> = {
      jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
      jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
    };
    const periodKey = col0.slice(0, 3).toLowerCase();
    const month = periodMap[periodKey] ?? 1;
    const year = 2026;
    const period_label = col0 || "—";

    const pushMetric = (
      platform: string,
      metric: string,
      value: unknown,
      col: number
    ) => {
      if (value === null || value === undefined || value === "" || value === "-")
        return;
      const num = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
      records.push({
        shopping: args.shopping,
        domain: "influencers",
        sheet_name: args.sheetName,
        platform,
        metric_name: metric,
        period_label,
        year,
        month,
        value: Number.isNaN(num) ? String(value) : num,
        value_type: Number.isNaN(num) ? "text" : "number",
        source_row: r,
        source_col: col,
        extra: { squad, assunto },
      });
    };

    pushMetric("TikTok", "curtidas", row[1], 1);
    pushMetric("TikTok", "comentarios", row[2], 2);
    pushMetric("TikTok", "alcance", row[6], 6);
    pushMetric("TikTok", "visualizacoes", row[7], 7);

    if (igStart >= 0) {
      pushMetric("Instagram", "curtidas", row[igStart + 2], igStart + 2);
      pushMetric("Instagram", "comentarios", row[igStart + 3], igStart + 3);
      pushMetric("Instagram", "alcance", row[igStart + 6], igStart + 6);
      pushMetric("Instagram", "visualizacoes", row[igStart + 7], igStart + 7);
    }
  }

  return records;
}
