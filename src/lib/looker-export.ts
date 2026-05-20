import type { LookerRow } from "@shared/looker/dataset";
import { lookerRowsToCsv, lookerRowsToJson } from "@shared/looker/csv";

export function downloadLookerCsv(rows: LookerRow[], filename: string) {
  const content = "\uFEFF" + lookerRowsToCsv(rows);
  downloadBlob(content, filename, "text/csv;charset=utf-8");
}

export function downloadLookerJson(rows: LookerRow[], filename: string) {
  downloadBlob(lookerRowsToJson(rows), filename, "application/json");
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildLookerFilename(
  format: "csv" | "json",
  filterLabel: string
): string {
  const slug = filterLabel
    .replace(/\s+/g, "-")
    .replace(/[·/]/g, "-")
    .replace(/[^\w-]/g, "")
    .toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  return `looker-multiplan-${slug || "completo"}-${date}.${format}`;
}
