import { create } from "zustand";
import type { Id } from "../../convex/_generated/dataModel";
import type { CompareGranularity } from "@shared/types";

export interface PeriodFilterState {
  year?: number;
  month?: number;
  quarter?: number;
  shopping?: string;
  compareGranularity?: CompareGranularity;
}

interface DashboardState {
  selectedUploadId: Id<"uploads"> | null;
  globalSearch: string;
  filterYear?: number;
  filterMonth?: number;
  filterQuarter?: number;
  filterShopping?: string;
  compareGranularity: CompareGranularity;
  setSelectedUpload: (id: Id<"uploads"> | null) => void;
  setGlobalSearch: (term: string) => void;
  setPeriodFilter: (filter: PeriodFilterState) => void;
  setCompareGranularity: (g: CompareGranularity) => void;
  clearPeriodFilter: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedUploadId: null,
  globalSearch: "",
  filterYear: undefined,
  filterMonth: undefined,
  filterQuarter: undefined,
  filterShopping: undefined,
  compareGranularity: "month",
  setSelectedUpload: (id) => set({ selectedUploadId: id }),
  setGlobalSearch: (term) => set({ globalSearch: term }),
  setPeriodFilter: (filter) =>
    set((state) => ({
      filterYear: filter.year,
      filterMonth: filter.month,
      filterQuarter: filter.quarter,
      filterShopping: filter.shopping,
      compareGranularity:
        filter.compareGranularity ?? state.compareGranularity,
    })),
  setCompareGranularity: (g) => set({ compareGranularity: g }),
  clearPeriodFilter: () =>
    set({
      filterYear: undefined,
      filterMonth: undefined,
      filterQuarter: undefined,
      filterShopping: undefined,
    }),
}));

/** Filtros para queries de dados (export, etc.) */
export function usePeriodFilterArgs() {
  const year = useDashboardStore((s) => s.filterYear);
  const month = useDashboardStore((s) => s.filterMonth);
  const quarter = useDashboardStore((s) => s.filterQuarter);
  const shopping = useDashboardStore((s) => s.filterShopping);
  return {
    year: year ?? undefined,
    month: month ?? undefined,
    quarter: quarter ?? undefined,
    shopping: shopping || undefined,
  };
}

/** Filtros completos para dashboards (inclui modo de comparação) */
export function useDashboardFilterArgs() {
  const period = usePeriodFilterArgs();
  const compareGranularity = useDashboardStore((s) => s.compareGranularity);
  return { ...period, compareGranularity };
}
