"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { lookerRowsToCsv, lookerRowsToJson } from "../shared/looker/csv";

export const buildSnapshot = internalAction({
  args: {
    exportId: v.id("looker_exports"),
    userId: v.id("users"),
    format: v.union(v.literal("csv"), v.literal("json")),
    shopping: v.optional(v.string()),
    year: v.optional(v.number()),
    month: v.optional(v.number()),
    quarter: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const result = await ctx.runQuery(internal.lookerExportInternal.loadDataset, {
        userId: args.userId,
        shopping: args.shopping,
        year: args.year,
        month: args.month,
        quarter: args.quarter,
      });

      const content =
        args.format === "csv"
          ? "\uFEFF" + lookerRowsToCsv(result.rows)
          : lookerRowsToJson(result.rows);

      const blob = new Blob([content], {
        type: args.format === "csv" ? "text/csv;charset=utf-8" : "application/json",
      });

      const storageId = await ctx.storage.store(blob);

      const suffix = new Date().toISOString().slice(0, 10);
      const filterParts = [args.shopping, args.year, args.month].filter(Boolean);
      const filterSlug = filterParts.length
        ? `-${filterParts.join("-")}`
        : "-completo";
      const fileName = `looker-multiplan${filterSlug}-${suffix}.${args.format}`;

      await ctx.runMutation(internal.lookerExportInternal.completeSnapshot, {
        exportId: args.exportId,
        storageId,
        rowCount: result.rows.length,
        fileName,
        truncated: result.truncated,
        totalCount: result.totalCount,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao gerar export Looker";
      await ctx.runMutation(internal.lookerExportInternal.failSnapshot, {
        exportId: args.exportId,
        errorMessage: message,
      });
    }
  },
});
