import type { ExecutiveAnalytics } from "@shared/types";
import {
  TimeSeriesChart,
  CategoryBarChart,
  RegionPieChart,
} from "./Charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InsightsPanel } from "./InsightsPanel";
import { KpiGrid } from "./KpiGrid";

function ComparisonTable({
  title,
  rows,
}: {
  title: string;
  rows: ExecutiveAnalytics["periodComparisons"];
}) {
  if (!rows.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Métrica</th>
              <th className="pb-2 pr-4 font-medium">Atual</th>
              <th className="pb-2 pr-4 font-medium">Anterior</th>
              <th className="pb-2 font-medium">Variação</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 8).map((r) => (
              <tr key={r.metricKey} className="border-b border-border/50">
                <td className="py-2 pr-4 capitalize">{r.metricKey}</td>
                <td className="py-2 pr-4 tabular-nums">
                  {r.currentValue.toLocaleString("pt-BR", {
                    maximumFractionDigits: 0,
                  })}
                  <span className="block text-xs text-muted-foreground">
                    {r.currentLabel}
                  </span>
                </td>
                <td className="py-2 pr-4 tabular-nums text-muted-foreground">
                  {r.previousValue.toLocaleString("pt-BR", {
                    maximumFractionDigits: 0,
                  })}
                  <span className="block text-xs">{r.previousLabel}</span>
                </td>
                <td
                  className={`py-2 font-medium tabular-nums ${
                    r.changePercent >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {r.changePercent >= 0 ? "+" : ""}
                  {r.changePercent.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function RankingList({
  title,
  data,
  suffix = "",
}: {
  title: string;
  data: { label: string; value: number }[];
  suffix?: string;
}) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.slice(0, 8).map((item, i) => (
          <div key={item.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">
                {i + 1}. {item.label}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {item.value.toLocaleString("pt-BR", {
                  maximumFractionDigits: suffix === "%" ? 1 : 0,
                })}
                {suffix}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function RegionalView({ data }: { data: ExecutiveAnalytics }) {
  return (
    <div className="space-y-6">
      <KpiGrid kpis={data.kpis} />
      <div className="grid gap-6 lg:grid-cols-2">
        <TimeSeriesChart data={data.timeSeries} title="Evolução mensal — investimento" />
        <RegionPieChart data={data.byRegion} title="Investimento por shopping" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ComparisonTable
          title="Comparativo de período (MoM / QoQ / anual)"
          rows={data.periodComparisons}
        />
        <ComparisonTable title="Crescimento YoY" rows={data.yoyComparisons} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <RankingList title="Ranking shoppings" data={data.rankings.shoppings} />
        <RankingList
          title="Benchmark — share por shopping (%)"
          data={data.benchmarking.shoppingShare}
          suffix="%"
        />
      </div>
      <InsightsPanel insights={data.insights} />
    </div>
  );
}

export function TemporalView({ data }: { data: ExecutiveAnalytics }) {
  const series =
    data.compareGranularity === "year"
      ? data.annualSeries
      : data.compareGranularity === "quarter"
        ? data.quarterlySeries
        : data.timeSeries;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Base histórica contínua — cada upload acrescenta meses à mesma tabela (não
        uma aba por mês).
      </p>
      <TimeSeriesChart
        data={series}
        title={
          data.compareGranularity === "year"
            ? "Evolução anual"
            : data.compareGranularity === "quarter"
              ? "Evolução trimestral"
              : "Evolução mensal"
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <TimeSeriesChart
          data={data.seasonality}
          title="Sazonalidade (média por mês do ano)"
        />
        <ComparisonTable
          title="Comparativos automáticos"
          rows={data.periodComparisons}
        />
      </div>
    </div>
  );
}

export function MediaView({ data }: { data: ExecutiveAnalytics }) {
  return (
    <div className="space-y-6">
      <KpiGrid kpis={data.kpis.filter((k) =>
        ["investimento", "impressoes", "alcance", "sessoes", "cliques"].includes(k.key)
      )} />
      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryBarChart
          data={data.mediaPlatforms.length ? data.mediaPlatforms : data.byCategory}
          title="Mídia por plataforma"
        />
        <RankingList
          title="Benchmark entre canais (%)"
          data={data.benchmarking.channelShare}
          suffix="%"
        />
      </div>
      <TimeSeriesChart data={data.timeSeries} title="Histórico de investimento em mídia" />
    </div>
  );
}

export function SocialView({ data }: { data: ExecutiveAnalytics }) {
  return (
    <div className="space-y-6">
      <KpiGrid kpis={data.kpis.filter((k) =>
        ["seguidores", "engajamento", "alcance", "views", "influenciadores"].includes(k.key)
      )} />
      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryBarChart data={data.socialPlatforms} title="TikTok vs Instagram e redes" />
        <RankingList title="Top creators / influenciadores" data={data.creators} />
      </div>
      <TimeSeriesChart data={data.timeSeries} title="Evolução social" />
    </div>
  );
}

export function ExecutiveSummaryView({ data }: { data: ExecutiveAnalytics }) {
  const alerts = data.insights.filter(
    (i) => i.type === "alert" || i.severity === "warning"
  );
  const highlights = data.insights.filter((i) => i.type !== "alert");

  return (
    <div className="space-y-6">
      <KpiGrid kpis={data.kpis.slice(0, 6)} />
      {alerts.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {alerts.map((a) => (
                <li key={a.id}>{a.description}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <InsightsPanel insights={highlights} />
      <ComparisonTable title="KPIs vs período anterior" rows={data.periodComparisons} />
    </div>
  );
}

export function ShoppingDetailView({
  data,
  shopping,
}: {
  data: ExecutiveAnalytics;
  shopping: string;
}) {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-lg font-semibold">Shopping {shopping}</h2>
      <KpiGrid kpis={data.kpis} />
      <div className="grid gap-6 lg:grid-cols-2">
        <TimeSeriesChart data={data.timeSeries} title={`Evolução — ${shopping}`} />
        <CategoryBarChart data={data.byCategory} title="Canais" />
      </div>
      <InsightsPanel insights={data.insights} />
    </div>
  );
}
