import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ExecutiveDashboard } from "@/components/dashboard/ExecutiveDashboard";
import { Input } from "@/components/ui/input";
import {
  useDashboardStore,
  useDashboardFilterArgs,
} from "@/stores/dashboardStore";
import type { Id } from "../../convex/_generated/dataModel";

export function DashboardPage() {
  const filterArgs = useDashboardFilterArgs();
  const executive = useQuery(api.dashboards.getExecutive, filterArgs);
  const periodOptions = useQuery(api.dashboards.getPeriodOptions);
  const uploads = useQuery(api.uploads.list, { limit: 20 });
  const globalSearch = useDashboardStore((s) => s.globalSearch);
  const setGlobalSearch = useDashboardStore((s) => s.setGlobalSearch);
  const selectedUploadId = useDashboardStore((s) => s.selectedUploadId);
  const setSelectedUpload = useDashboardStore((s) => s.setSelectedUpload);

  if (executive === undefined || periodOptions === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!periodOptions?.years.length && !executive) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="font-display text-3xl font-bold">
          Dashboard Executivo
        </h1>
        <p className="mt-2 max-w-lg text-muted-foreground">
          Faça upload das planilhas PKB, BSS e PCN em{" "}
          <strong>Uploads</strong>. O sistema normaliza os dados e monta o
          dashboard com filtros por ano, mês e shopping.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Dashboard Executivo
          </h1>
          <p className="text-muted-foreground">
            {executive
              ? `Base histórica contínua · ${executive.recordCount.toLocaleString("pt-BR")} métricas · ${executive.filterLabel}`
              : "Ajuste os filtros ou envie planilhas (append mensal)"}
          </p>
        </div>
        <div className="flex gap-3">
          <Input
            placeholder="Busca global..."
            className="w-44"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
          />
          <select
            className="h-10 rounded-lg border border-border bg-muted/50 px-3 text-sm max-w-[220px]"
            value={selectedUploadId ?? ""}
            onChange={(e) =>
              setSelectedUpload(
                e.target.value
                  ? (e.target.value as Id<"uploads">)
                  : null
              )
            }
          >
            <option value="">Base histórica completa</option>
            {uploads?.map((u: { _id: string; fileName: string; shopping?: string }) => (
              <option key={u._id} value={u._id}>
                {u.shopping ? `${u.shopping} — ` : ""}
                {u.fileName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ExecutiveDashboard />
    </div>
  );
}
