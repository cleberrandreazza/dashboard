import type { MultiplanRecord } from "./types";

export interface PeriodFilter {
  year?: number;
  month?: number;
  quarter?: number;
  shopping?: string;
}

export function filterRecords(
  records: MultiplanRecord[],
  filter: PeriodFilter
): MultiplanRecord[] {
  return records.filter((r) => {
    if (filter.shopping && r.shopping !== filter.shopping) return false;
    if (filter.year !== undefined && r.year !== filter.year) return false;
    if (filter.month !== undefined && r.month !== filter.month) return false;
    if (filter.quarter !== undefined) {
      const q = Math.ceil(r.month / 3);
      if (q !== filter.quarter) return false;
    }
    return true;
  });
}

export function extractPeriodOptions(records: MultiplanRecord[]) {
  const years = new Set<number>();
  const yearMonths = new Map<number, Set<number>>();

  for (const r of records) {
    if (!r.year) continue;
    years.add(r.year);
    if (!yearMonths.has(r.year)) yearMonths.set(r.year, new Set());
    if (r.month) yearMonths.get(r.year)!.add(r.month);
  }

  const sortedYears = [...years].sort((a, b) => b - a);
  const periods = sortedYears.flatMap((year) => {
    const months = [...(yearMonths.get(year) ?? [])].sort((a, b) => a - b);
    return months.map((month) => ({
      year,
      month,
      label: `${String(month).padStart(2, "0")}/${year}`,
      key: `${year}-${month}`,
    }));
  });

  const quarters = sortedYears.flatMap((year) => {
    const months = yearMonths.get(year) ?? new Set();
    const qs = new Set<number>();
    for (const m of months) qs.add(Math.ceil(m / 3));
    return [...qs].sort().map((quarter) => ({
      year,
      quarter,
      label: `T${quarter}/${year}`,
      key: `${year}-Q${quarter}`,
    }));
  });

  return { years: sortedYears, periods, quarters };
}
