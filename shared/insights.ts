import type { DashboardSnapshot, InsightItem, ParsedRow } from "./types";

function sumField(rows: ParsedRow[], field: string): number {
  return rows.reduce((acc, r) => {
    const v = r.normalized[field];
    return acc + (typeof v === "number" ? v : 0);
  }, 0);
}

function groupByField(
  rows: ParsedRow[],
  field: string
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = String(row.normalized[field] ?? "N/A");
    const amount = typeof row.normalized.amount === "number"
      ? row.normalized.amount
      : 1;
    map.set(key, (map.get(key) ?? 0) + amount);
  }
  return map;
}

function topEntries(map: Map<string, number>, limit = 8) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

export function generateInsights(rows: ParsedRow[]): InsightItem[] {
  const insights: InsightItem[] = [];
  if (rows.length === 0) {
    return [
      {
        id: "empty",
        type: "alert",
        severity: "warning",
        title: "Sem dados",
        description: "Nenhum registro normalizado encontrado neste conjunto.",
      },
    ];
  }

  const totalAmount = sumField(rows, "amount");
  const totalQty = sumField(rows, "quantity");

  insights.push({
    id: "summary-total",
    type: "summary",
    severity: "info",
    title: "Resumo do volume",
    description: `${rows.length.toLocaleString("pt-BR")} registros processados com valor agregado de R$ ${totalAmount.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}.`,
    metric: "amount",
    value: totalAmount,
  });

  if (totalQty > 0) {
    insights.push({
      id: "summary-qty",
      type: "summary",
      severity: "info",
      title: "Quantidade total",
      description: `${totalQty.toLocaleString("pt-BR")} unidades registradas no período analisado.`,
      metric: "quantity",
      value: totalQty,
    });
  }

  const byCategory = groupByField(rows, "category");
  if (byCategory.size > 1) {
    const sorted = topEntries(byCategory, 2);
    const top = sorted[0];
    const second = sorted[1];
    if (top && second && second.value > 0) {
      const growth = ((top.value - second.value) / second.value) * 100;
      insights.push({
        id: "comparison-category",
        type: "comparison",
        severity: "info",
        title: "Categoria líder",
        description: `"${top.label}" lidera com ${growth.toFixed(0)}% a mais que "${second.label}".`,
        changePercent: growth,
      });
    }
  }

  const byRegion = groupByField(rows, "region");
  const regions = topEntries(byRegion, 1);
  if (regions[0]) {
    insights.push({
      id: "growth-region",
      type: "growth",
      severity: "info",
      title: "Região de maior contribuição",
      description: `${regions[0].label} concentra o maior volume de valor no dataset.`,
      metric: "region",
      value: regions[0].value,
    });
  }

  const amounts = rows
    .map((r) => r.normalized.amount)
    .filter((v): v is number => typeof v === "number");
  if (amounts.length > 10) {
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const std = Math.sqrt(
      amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / amounts.length
    );
    const anomalies = amounts.filter((v) => Math.abs(v - mean) > 2 * std);
    if (anomalies.length > 0) {
      insights.push({
        id: "anomaly-amount",
        type: "anomaly",
        severity: "warning",
        title: "Valores atípicos detectados",
        description: `${anomalies.length} transação(ões) com valores fora do padrão estatístico (±2σ).`,
      });
    }
  }

  const dates = rows
    .map((r) => r.normalized.date)
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => a - b);

  if (dates.length >= 4) {
    const mid = Math.floor(dates.length / 2);
    const firstHalf = rows.filter(
      (r) => typeof r.normalized.date === "number" && (r.normalized.date as number) <= dates[mid]
    );
    const secondHalf = rows.filter(
      (r) => typeof r.normalized.date === "number" && (r.normalized.date as number) > dates[mid]
    );
    const a1 = sumField(firstHalf, "amount");
    const a2 = sumField(secondHalf, "amount");
    if (a1 > 0) {
      const change = ((a2 - a1) / a1) * 100;
      const direction = change >= 0 ? "cresceram" : "caíram";
      insights.push({
        id: "trend-temporal",
        type: "trend",
        severity: change < -20 ? "warning" : "info",
        title: "Tendência temporal",
        description: `Vendas ${direction} ${Math.abs(change).toFixed(0)}% na segunda metade do período analisado.`,
        changePercent: change,
      });
    }
  }

  return insights;
}

export function buildDashboardSnapshot(rows: ParsedRow[]): DashboardSnapshot {
  const totalAmount = sumField(rows, "amount");
  const totalQty = sumField(rows, "quantity");
  const avgTicket = rows.length > 0 ? totalAmount / rows.length : 0;

  const byCategory = topEntries(groupByField(rows, "category"));
  const byRegion = topEntries(groupByField(rows, "region"));

  const timeMap = new Map<string, number>();
  for (const row of rows) {
    const d = row.normalized.date;
    if (typeof d !== "number") continue;
    const label = new Date(d).toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    });
    const amt = typeof row.normalized.amount === "number" ? row.normalized.amount : 0;
    timeMap.set(label, (timeMap.get(label) ?? 0) + amt);
  }
  const timeSeries = [...timeMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .slice(-12);

  const insights = generateInsights(rows);

  return {
    kpis: [
      {
        key: "total_amount",
        label: "Receita total",
        value: totalAmount,
        format: "currency",
      },
      {
        key: "total_records",
        label: "Registros",
        value: rows.length,
        format: "number",
      },
      {
        key: "total_quantity",
        label: "Quantidade",
        value: totalQty,
        format: "number",
      },
      {
        key: "avg_ticket",
        label: "Ticket médio",
        value: avgTicket,
        format: "currency",
      },
    ],
    timeSeries,
    byCategory,
    byRegion,
    insights,
  };
}
