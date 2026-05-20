import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";

export function RecordsTable({ uploadId }: { uploadId?: Id<"uploads"> }) {
  const [search, setSearch] = useState("");
  const globalSearch = useDashboardStore((s) => s.globalSearch);
  const term = search || globalSearch;

  const records = useQuery(
    api.records.listByUpload,
    uploadId ? { uploadId, limit: 200 } : "skip"
  );

  const searchResults = useQuery(
    api.records.search,
    uploadId && term ? { uploadId, term, limit: 50 } : "skip"
  );

  const display = term && searchResults ? searchResults : records;

  if (!uploadId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Selecione um upload para ver registros normalizados
        </CardContent>
      </Card>
    );
  }

  const columns = new Set<string>();
  display?.forEach((r: { data: Record<string, unknown> }) =>
    Object.keys(r.data).forEach((k) => columns.add(k))
  );
  const preferred = [
    "shopping",
    "domain",
    "platform",
    "metric_name",
    "period_label",
    "year",
    "month",
    "value",
  ];
  const cols = [
    ...preferred.filter((c) => columns.has(c)),
    ...[...columns].filter((c) => !preferred.includes(c)),
  ].slice(0, 10);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Dados normalizados</CardTitle>
        <Input
          placeholder="Buscar..."
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {!display ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : display.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                {cols.map((c) => (
                  <th key={c} className="pb-2 pr-4 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {display.slice(0, 50).map((row: { _id: string; data: Record<string, unknown> }) => (
                <tr key={row._id} className="border-b border-border/50">
                  {cols.map((c) => (
                    <td key={c} className="py-2 pr-4">
                      {String(row.data[c] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
