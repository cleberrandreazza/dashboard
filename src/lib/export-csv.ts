export interface CsvRow {
  shopping: string;
  domain: string;
  sheet_name: string;
  platform: string;
  metric_name: string;
  period_label: string;
  year: number;
  month: number;
  value: string | number | null;
  value_type: string;
}

export function recordsToCsv(rows: CsvRow[]): string {
  const headers = [
    "shopping",
    "domain",
    "sheet_name",
    "platform",
    "metric_name",
    "period_label",
    "year",
    "month",
    "value",
    "value_type",
  ];
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => escape(r[h as keyof CsvRow])).join(",")
    ),
  ];
  return lines.join("\n");
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
