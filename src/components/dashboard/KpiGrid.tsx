import type { DashboardKpi } from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKpi } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export function KpiGrid({ kpis }: { kpis: DashboardKpi[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              {kpi.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold">
              {formatKpi(kpi.value, kpi.format)}
            </p>
            {kpi.changePercent !== undefined && (
              <p
                className={`mt-1 flex items-center gap-1 text-xs ${
                  kpi.changePercent >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {kpi.changePercent >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(kpi.changePercent).toFixed(1)}%
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
