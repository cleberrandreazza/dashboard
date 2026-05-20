import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { loadUserMultiplanRecords } from "./lib/records";
import { filterRecords } from "../shared/multiplan/filters";
import { buildLookerDataset } from "../shared/looker/dataset";

const MAX_ROWS = 50_000;

export const loadDataset = internalQuery({
  args: {
    userId: v.id("users"),
    shopping: v.optional(v.string()),
    year: v.optional(v.number()),
    month: v.optional(v.number()),
    quarter: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const all = await loadUserMultiplanRecords(ctx, args.userId);
    const filtered = filterRecords(all, {
      shopping: args.shopping,
      year: args.year,
      month: args.month,
      quarter: args.quarter,
    });
    const rows = buildLookerDataset(filtered);
    const truncated = rows.length > MAX_ROWS;
    return {
      rows: truncated ? rows.slice(0, MAX_ROWS) : rows,
      truncated,
      totalCount: rows.length,
    };
  },
});

export const completeSnapshot = internalMutation({
  args: {
    exportId: v.id("looker_exports"),
    storageId: v.id("_storage"),
    rowCount: v.number(),
    fileName: v.string(),
    truncated: v.boolean(),
    totalCount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.exportId, {
      status: "ready",
      storageId: args.storageId,
      rowCount: args.rowCount,
      fileName: args.fileName,
      truncated: args.truncated,
      totalCount: args.totalCount,
      errorMessage: undefined,
      completedAt: Date.now(),
    });
  },
});

export const failSnapshot = internalMutation({
  args: {
    exportId: v.id("looker_exports"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.exportId, {
      status: "failed",
      errorMessage: args.errorMessage,
      completedAt: Date.now(),
    });
  },
});
