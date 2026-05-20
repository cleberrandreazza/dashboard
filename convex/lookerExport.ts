import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth } from "./lib/auth";
import { loadUserMultiplanRecords } from "./lib/records";
import { filterRecords } from "../shared/multiplan/filters";
import {
  buildLookerDataset,
  LOOKER_SCHEMA_DESCRIPTION,
} from "../shared/looker/dataset";
import { logAudit } from "./lib/audit";

const periodFilterArgs = {
  shopping: v.optional(v.string()),
  year: v.optional(v.number()),
  month: v.optional(v.number()),
  quarter: v.optional(v.number()),
};

export const getMeta = query({
  args: periodFilterArgs,
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const all = await loadUserMultiplanRecords(ctx, userId);
    const filtered = filterRecords(all, args);
    const dataset = buildLookerDataset(filtered);

    const shoppings = [...new Set(dataset.map((r) => r.shopping))].sort();
    const domains = [...new Set(dataset.map((r) => r.domain))].sort();
    const periods = [...new Set(dataset.map((r) => r.period_key))].sort();

    return {
      schema: LOOKER_SCHEMA_DESCRIPTION,
      rowCount: dataset.length,
      totalRows: all.length,
      shoppings,
      domains,
      periods,
      columns: [
        "date",
        "period_key",
        "year",
        "month",
        "quarter",
        "shopping",
        "domain_label",
        "platform",
        "metric_name",
        "metric_key",
        "value_numeric",
        "campaign",
      ],
    };
  },
});

/** Amostra para preview (máx. 500 linhas) */
export const preview = query({
  args: {
    ...periodFilterArgs,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const all = await loadUserMultiplanRecords(ctx, userId);
    const filtered = filterRecords(all, args);
    const dataset = buildLookerDataset(filtered);
    const limit = Math.min(args.limit ?? 100, 500);
    return dataset.slice(0, limit);
  },
});

/** Dataset completo para download no cliente (até 50k linhas) */
export const getDataset = query({
  args: periodFilterArgs,
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const all = await loadUserMultiplanRecords(ctx, userId);
    const filtered = filterRecords(all, args);
    const dataset = buildLookerDataset(filtered);
    const MAX = 50_000;
    if (dataset.length > MAX) {
      return {
        rows: dataset.slice(0, MAX),
        truncated: true,
        totalCount: dataset.length,
        maxRows: MAX,
      };
    }
    return {
      rows: dataset,
      truncated: false,
      totalCount: dataset.length,
      maxRows: MAX,
    };
  },
});

export const listSnapshots = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const rows = await ctx.db
      .query("looker_exports")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit ?? 10);

    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        downloadUrl: row.storageId
          ? await ctx.storage.getUrl(row.storageId)
          : null,
      }))
    );
  },
});

export const getSnapshotUrl = query({
  args: { exportId: v.id("looker_exports") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const row = await ctx.db.get(args.exportId);
    if (!row || row.userId !== userId || !row.storageId) return null;
    return await ctx.storage.getUrl(row.storageId);
  },
});

export const createSnapshot = mutation({
  args: {
    ...periodFilterArgs,
    format: v.union(v.literal("csv"), v.literal("json")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const exportId = await ctx.db.insert("looker_exports", {
      userId,
      status: "pending",
      format: args.format,
      rowCount: 0,
      filters: {
        shopping: args.shopping,
        year: args.year,
        month: args.month,
        quarter: args.quarter,
      },
      fileName: "",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.lookerExportAction.buildSnapshot, {
      exportId,
      userId,
      shopping: args.shopping,
      year: args.year,
      month: args.month,
      quarter: args.quarter,
      format: args.format,
    });

    await logAudit(ctx, {
      userId,
      entityType: "looker_export",
      entityId: exportId,
      action: "snapshot_scheduled",
      metadata: { format: args.format },
    });

    return exportId;
  },
});
