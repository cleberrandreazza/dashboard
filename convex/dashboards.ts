import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, assertOwnership } from "./lib/auth";
import { loadUserMultiplanRecords } from "./lib/records";
import {
  buildExecutiveAnalytics,
  type CompareGranularity,
  type ExecutiveAnalytics,
} from "../shared/multiplan/insights";
import { filterRecords, extractPeriodOptions } from "../shared/multiplan/filters";

const filterArgs = {
  year: v.optional(v.number()),
  month: v.optional(v.number()),
  quarter: v.optional(v.number()),
  shopping: v.optional(v.string()),
  compareGranularity: v.optional(
    v.union(v.literal("month"), v.literal("quarter"), v.literal("year"))
  ),
};

type FilterInput = {
  year?: number;
  month?: number;
  quarter?: number;
  shopping?: string;
  compareGranularity?: CompareGranularity;
};

function applyFilters(
  records: Awaited<ReturnType<typeof loadUserMultiplanRecords>>,
  args: FilterInput
) {
  return filterRecords(records, {
    year: args.year,
    month: args.month,
    quarter: args.quarter,
    shopping: args.shopping,
  });
}

function buildOpts(args: FilterInput) {
  return {
    compareGranularity: args.compareGranularity ?? "month",
    focusYear: args.year,
    focusMonth: args.month,
  };
}

export const list = query({
  args: {
    type: v.optional(
      v.union(
        v.literal("global"),
        v.literal("upload"),
        v.literal("comparative"),
        v.literal("temporal")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    if (args.type) {
      return await ctx.db
        .query("dashboards")
        .withIndex("by_user_type", (q) =>
          q.eq("userId", userId).eq("type", args.type!)
        )
        .collect();
    }
    return await ctx.db
      .query("dashboards")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const get = query({
  args: { dashboardId: v.id("dashboards") },
  handler: async (ctx, args) => {
    const dashboard = await ctx.db.get(args.dashboardId);
    if (!dashboard) return null;
    await assertOwnership(ctx, dashboard.userId);
    return dashboard;
  },
});

export const getByUpload = query({
  args: { uploadId: v.id("uploads") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    return await ctx.db
      .query("dashboards")
      .withIndex("by_upload", (q) => q.eq("uploadId", args.uploadId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
  },
});

export const getPeriodOptions = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);
    const records = await loadUserMultiplanRecords(ctx, userId);
    const shoppings = [...new Set(records.map((r) => r.shopping))].sort();
    return {
      ...extractPeriodOptions(records),
      shoppings,
    };
  },
});

export const getRegional = query({
  args: filterArgs,
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const all = await loadUserMultiplanRecords(ctx, userId);
    const records = applyFilters(all, args);
    if (records.length === 0) return null;

    const uploads = await ctx.db
      .query("uploads")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    return {
      snapshot: buildExecutiveAnalytics(records, buildOpts(args)),
      uploadCount: uploads.filter((u) => u.parserType === "multiplan" || u.shopping)
        .length,
      recordCount: records.length,
      totalRecords: all.length,
      shoppings: [...new Set(all.map((r) => r.shopping))],
    };
  },
});

export const getExecutive = query({
  args: filterArgs,
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const all = await loadUserMultiplanRecords(ctx, userId);
    const records = applyFilters(all, args);
    if (records.length === 0) return null;

    const shoppings = [...new Set(all.map((r) => r.shopping))].sort();

    const opts = buildOpts(args);
    const byShopping: Record<string, ExecutiveAnalytics> = {};
    for (const shop of shoppings) {
      const shopRecords = applyFilters(all, { ...args, shopping: shop });
      if (shopRecords.length > 0) {
        byShopping[shop] = buildExecutiveAnalytics(shopRecords, {
          ...opts,
          shopping: shop,
        });
      }
    }

    const regional = buildExecutiveAnalytics(records, opts);
    const temporal = buildExecutiveAnalytics(all, {
      ...opts,
      shopping: args.shopping,
    });

    return {
      regional,
      comparative: regional,
      temporal,
      executive: buildExecutiveAnalytics(records, opts),
      byShopping,
      media: buildExecutiveAnalytics(records, {
        ...opts,
        domains: ["analytics", "vendors", "social_media"],
      }),
      social: buildExecutiveAnalytics(records, {
        ...opts,
        domains: ["social_media", "influencers"],
      }),
      crm: buildExecutiveAnalytics(records, {
        ...opts,
        domains: ["multi_app", "shopping"],
      }),
      influencers: buildExecutiveAnalytics(records, {
        ...opts,
        domains: ["influencers", "vendors"],
      }),
      shopping: buildExecutiveAnalytics(records, {
        ...opts,
        domains: ["shopping"],
      }),
      multi: buildExecutiveAnalytics(records, {
        ...opts,
        domains: ["multi_app"],
      }),
      recordCount: records.length,
      totalRecords: all.length,
      shoppings,
      filterLabel: formatFilterLabel(args),
      compareGranularity: opts.compareGranularity ?? "month",
    };
  },
});

function formatFilterLabel(args: FilterInput): string {
  const parts: string[] = [];
  if (args.shopping) parts.push(args.shopping);
  if (args.quarter && args.year) {
    parts.push(`T${args.quarter}/${args.year}`);
  } else if (args.month && args.year) {
    parts.push(`${String(args.month).padStart(2, "0")}/${args.year}`);
  } else if (args.year) {
    parts.push(String(args.year));
  } else {
    parts.push("histórico completo");
  }
  const gran =
    args.compareGranularity === "quarter"
      ? "comparativo trimestral"
      : args.compareGranularity === "year"
        ? "comparativo anual"
        : "comparativo mensal";
  return `${parts.join(" · ")} · ${gran}`;
}

export const updateFilters = mutation({
  args: {
    dashboardId: v.id("dashboards"),
    filters: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    const dashboard = await ctx.db.get(args.dashboardId);
    if (!dashboard) throw new Error("Dashboard não encontrado");
    await assertOwnership(ctx, dashboard.userId);
    await ctx.db.patch(args.dashboardId, {
      filters: args.filters,
      updatedAt: Date.now(),
    });
  },
});
