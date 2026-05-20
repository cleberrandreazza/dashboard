/** Parse "Jan.26", "Fev. 26", "Nov. 26" → { year, month, label } */
export function parsePeriodLabel(label: string): {
  year: number;
  month: number;
  label: string;
} | null {
  const raw = label.trim();
  if (!raw) return null;

  const months: Record<string, number> = {
    jan: 1,
    fev: 2,
    mar: 3,
    abr: 4,
    mai: 5,
    jun: 6,
    jul: 7,
    ago: 8,
    set: 9,
    out: 10,
    nov: 11,
    dez: 12,
  };

  const match = raw.match(/^([A-Za-zÀ-ú]{3})\.?\s*(\d{2,4})$/i);
  if (!match) return null;

  const monKey = match[1].toLowerCase().slice(0, 3);
  const month = months[monKey];
  if (!month) return null;

  let year = parseInt(match[2], 10);
  if (year < 100) year += 2000;

  return { year, month, label: raw };
}

export function isPeriodHeader(cell: unknown): boolean {
  if (cell === null || cell === undefined) return false;
  return parsePeriodLabel(String(cell)) !== null;
}
