import type { LookerRow } from "./dataset";
import { LOOKER_CSV_COLUMNS } from "./dataset";

function escapeCsvCell(v: unknown): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function lookerRowsToCsv(rows: LookerRow[]): string {
  const header = LOOKER_CSV_COLUMNS.join(",");
  const lines = rows.map((row) =>
    LOOKER_CSV_COLUMNS.map((col) => escapeCsvCell(row[col])).join(",")
  );
  return [header, ...lines].join("\r\n");
}

export function lookerRowsToJson(rows: LookerRow[]): string {
  return JSON.stringify(rows, null, 2);
}
