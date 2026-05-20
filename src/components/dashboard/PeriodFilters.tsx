import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useDashboardStore } from "@/stores/dashboardStore";
import type { CompareGranularity } from "@shared/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

const MONTHS = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Fev" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Abr" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Ago" },
  { value: 9, label: "Set" },
  { value: 10, label: "Out" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dez" },
];

const COMPARE_MODES: { value: CompareGranularity; label: string }[] = [
  { value: "month", label: "Mensal" },
  { value: "quarter", label: "Trimestral" },
  { value: "year", label: "Anual" },
];

export function PeriodFilters() {
  const options = useQuery(api.dashboards.getPeriodOptions);
  const filterYear = useDashboardStore((s) => s.filterYear);
  const filterMonth = useDashboardStore((s) => s.filterMonth);
  const filterQuarter = useDashboardStore((s) => s.filterQuarter);
  const filterShopping = useDashboardStore((s) => s.filterShopping);
  const compareGranularity = useDashboardStore((s) => s.compareGranularity);
  const setPeriodFilter = useDashboardStore((s) => s.setPeriodFilter);
  const setCompareGranularity = useDashboardStore((s) => s.setCompareGranularity);
  const clearPeriodFilter = useDashboardStore((s) => s.clearPeriodFilter);

  const hasFilter =
    filterYear !== undefined ||
    filterMonth !== undefined ||
    filterQuarter !== undefined ||
    !!filterShopping;

  if (!options) return null;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-4 pt-6">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filtros globais
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Comparação
          </label>
          <select
            className="h-9 rounded-lg border border-border bg-muted/50 px-3 text-sm min-w-[120px]"
            value={compareGranularity}
            onChange={(e) =>
              setCompareGranularity(e.target.value as CompareGranularity)
            }
          >
            {COMPARE_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Shopping
          </label>
          <select
            className="h-9 rounded-lg border border-border bg-muted/50 px-3 text-sm min-w-[100px]"
            value={filterShopping ?? ""}
            onChange={(e) =>
              setPeriodFilter({
                year: filterYear,
                month: filterMonth,
                quarter: filterQuarter,
                shopping: e.target.value || undefined,
                compareGranularity,
              })
            }
          >
            <option value="">Todos (benchmark)</option>
            {options.shoppings.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Ano</label>
          <select
            className="h-9 rounded-lg border border-border bg-muted/50 px-3 text-sm min-w-[90px]"
            value={filterYear ?? ""}
            onChange={(e) => {
              const year = e.target.value ? Number(e.target.value) : undefined;
              setPeriodFilter({
                year,
                month: filterMonth,
                quarter: filterQuarter,
                shopping: filterShopping,
                compareGranularity,
              });
            }}
          >
            <option value="">Todos</option>
            {options.years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {compareGranularity === "quarter" ? (
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Trimestre
            </label>
            <select
              className="h-9 rounded-lg border border-border bg-muted/50 px-3 text-sm min-w-[100px]"
              value={filterQuarter ?? ""}
              onChange={(e) =>
                setPeriodFilter({
                  year: filterYear,
                  month: undefined,
                  quarter: e.target.value ? Number(e.target.value) : undefined,
                  shopping: filterShopping,
                  compareGranularity,
                })
              }
            >
              <option value="">Todos</option>
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={q}>
                  T{q}
                </option>
              ))}
            </select>
          </div>
        ) : compareGranularity === "month" ? (
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Mês</label>
            <select
              className="h-9 rounded-lg border border-border bg-muted/50 px-3 text-sm min-w-[90px]"
              value={filterMonth ?? ""}
              onChange={(e) =>
                setPeriodFilter({
                  year: filterYear,
                  month: e.target.value ? Number(e.target.value) : undefined,
                  quarter: undefined,
                  shopping: filterShopping,
                  compareGranularity,
                })
              }
            >
              <option value="">Todos</option>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {hasFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            onClick={clearPeriodFilter}
          >
            <X className="h-3 w-3" />
            Limpar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
