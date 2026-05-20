import type { InsightItem } from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  TrendingUp,
  Sparkles,
  BarChart2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconByType: Record<InsightItem["type"], React.ElementType> = {
  summary: Sparkles,
  trend: TrendingUp,
  alert: AlertTriangle,
  anomaly: Zap,
  growth: BarChart2,
  comparison: BarChart2,
};

export function InsightsPanel({ insights }: { insights: InsightItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Insights automáticos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => {
          const Icon = iconByType[insight.type];
          return (
            <div
              key={insight.id}
              className={cn(
                "flex gap-3 rounded-lg border p-4",
                insight.severity === "warning"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : insight.severity === "critical"
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border"
              )}
            >
              <Icon className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">{insight.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {insight.description}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
