import { v } from "convex/values";

const chartPoint = v.object({ label: v.string(), value: v.number() });

const dashboardKpi = v.object({
  key: v.string(),
  label: v.string(),
  value: v.number(),
  format: v.union(
    v.literal("number"),
    v.literal("currency"),
    v.literal("percent")
  ),
  changePercent: v.optional(v.number()),
});

const insightItem = v.object({
  id: v.string(),
  type: v.union(
    v.literal("summary"),
    v.literal("trend"),
    v.literal("alert"),
    v.literal("anomaly"),
    v.literal("growth"),
    v.literal("comparison")
  ),
  severity: v.union(
    v.literal("info"),
    v.literal("warning"),
    v.literal("critical")
  ),
  title: v.string(),
  description: v.string(),
  metric: v.optional(v.string()),
  value: v.optional(v.number()),
  changePercent: v.optional(v.number()),
});

const periodComparison = v.object({
  metricKey: v.string(),
  currentLabel: v.string(),
  previousLabel: v.string(),
  currentValue: v.number(),
  previousValue: v.number(),
  changePercent: v.number(),
});

/** Snapshot base + campos históricos (ExecutiveAnalytics). */
export const dashboardSnapshotValidator = v.object({
  kpis: v.array(dashboardKpi),
  timeSeries: v.array(chartPoint),
  byCategory: v.array(chartPoint),
  byRegion: v.array(chartPoint),
  insights: v.array(insightItem),
  compareGranularity: v.optional(
    v.union(v.literal("month"), v.literal("quarter"), v.literal("year"))
  ),
  periodComparisons: v.optional(v.array(periodComparison)),
  yoyComparisons: v.optional(v.array(periodComparison)),
  seasonality: v.optional(v.array(chartPoint)),
  quarterlySeries: v.optional(v.array(chartPoint)),
  annualSeries: v.optional(v.array(chartPoint)),
  rankings: v.optional(
    v.object({
      shoppings: v.array(chartPoint),
      channels: v.array(chartPoint),
    })
  ),
  benchmarking: v.optional(
    v.object({
      shoppingShare: v.array(chartPoint),
      channelShare: v.array(chartPoint),
    })
  ),
  mediaPlatforms: v.optional(v.array(chartPoint)),
  mediaChannels: v.optional(
    v.array(
      v.object({
        id: v.union(
          v.literal("instagram"),
          v.literal("tiktok"),
          v.literal("meta"),
          v.literal("google")
        ),
        label: v.string(),
        investment: v.number(),
        publications: v.number(),
      })
    )
  ),
  socialPlatforms: v.optional(v.array(chartPoint)),
  creators: v.optional(v.array(chartPoint)),
});
