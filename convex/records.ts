import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAuth, assertOwnership } from "./lib/auth";
import { loadUserMultiplanRecords } from "./lib/records";
import { filterRecords } from "../shared/multiplan/filters";

export const listByUpload = query({
  args: {
    uploadId: v.id("uploads"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const upload = await ctx.db.get(args.uploadId);
    if (!upload) return [];
    await assertOwnership(ctx, upload.userId);
    return await ctx.db
      .query("normalized_records")
      .withIndex("by_upload", (q) => q.eq("uploadId", args.uploadId))
      .take(args.limit ?? 500);
  },
});

export const search = query({
  args: {
    uploadId: v.id("uploads"),
    term: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const upload = await ctx.db.get(args.uploadId);
    if (!upload) return [];
    await assertOwnership(ctx, upload.userId);

    const term = args.term.toLowerCase().trim();
    if (!term) return [];

    const records = await ctx.db
      .query("normalized_records")
      .withIndex("by_upload", (q) => q.eq("uploadId", args.uploadId))
      .take(2000);

    return records
      .filter((r) =>
        Object.values(r.data).some((val) =>
          String(val ?? "")
            .toLowerCase()
            .includes(term)
        )
      )
      .slice(0, args.limit ?? 100);
  },
});

export const exportConsolidated = query({
  args: {
    shopping: v.optional(v.string()),
    domain: v.optional(v.string()),
    year: v.optional(v.number()),
    month: v.optional(v.number()),
    quarter: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    let records = await loadUserMultiplanRecords(ctx, userId);

    records = filterRecords(records, {
      shopping: args.shopping,
      year: args.year,
      month: args.month,
      quarter: args.quarter,
    });

    if (args.domain) {
      records = records.filter((r) => r.domain === args.domain);
    }

    return records.map((r) => ({
      shopping: r.shopping,
      domain: r.domain,
      sheet_name: r.sheet_name,
      platform: r.platform ?? "",
      metric_name: r.metric_name,
      period_label: r.period_label,
      year: r.year,
      month: r.month,
      value: r.value,
      value_type: r.value_type,
    }));
  },
});
