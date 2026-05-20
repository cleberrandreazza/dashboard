import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { logAudit } from "./lib/audit";

const snapshotValidator = v.object({
  kpis: v.array(
    v.object({
      key: v.string(),
      label: v.string(),
      value: v.number(),
      format: v.union(
        v.literal("number"),
        v.literal("currency"),
        v.literal("percent")
      ),
      changePercent: v.optional(v.number()),
    })
  ),
  timeSeries: v.array(v.object({ label: v.string(), value: v.number() })),
  byCategory: v.array(v.object({ label: v.string(), value: v.number() })),
  byRegion: v.array(v.object({ label: v.string(), value: v.number() })),
  insights: v.array(
    v.object({
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
    })
  ),
});

export const getUploadInternal = internalQuery({
  args: { uploadId: v.id("uploads") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.uploadId);
  },
});

export const getProfileInternal = internalQuery({
  args: { userId: v.id("users"), profileId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sheet_profiles")
      .withIndex("by_profile_id", (q) =>
        q.eq("userId", args.userId).eq("profileId", args.profileId)
      )
      .first();
  },
});

export const getDefaultProfileInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sheet_profiles")
      .withIndex("by_user_default", (q) =>
        q.eq("userId", args.userId).eq("isDefault", true)
      )
      .first();
  },
});

export const markFailed = internalMutation({
  args: {
    uploadId: v.id("uploads"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const upload = await ctx.db.get(args.uploadId);
    if (!upload || upload.errorMessage === "__removing__") return;
    await ctx.db.patch(args.uploadId, {
      status: "failed",
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    });
  },
});

export const persistProcessing = internalMutation({
  args: {
    uploadId: v.id("uploads"),
    userId: v.id("users"),
    fileName: v.string(),
    shopping: v.optional(v.string()),
    parserType: v.optional(v.union(v.literal("multiplan"), v.literal("generic"))),
    profileId: v.optional(v.string()),
    parseWarnings: v.optional(v.array(v.string())),
    sheetCount: v.number(),
    rowCount: v.number(),
    sheets: v.array(
      v.object({
        name: v.string(),
        headerRowIndex: v.number(),
        dataStartRowIndex: v.number(),
        headers: v.array(v.string()),
        rowCount: v.number(),
        mappings: v.array(
          v.object({
            sourceColumn: v.string(),
            canonicalField: v.string(),
            confidence: v.number(),
            dataType: v.string(),
          })
        ),
        rows: v.array(
          v.object({
            sourceRowIndex: v.number(),
            data: v.record(
              v.string(),
              v.union(v.string(), v.number(), v.boolean(), v.null())
            ),
          })
        ),
      })
    ),
    snapshot: snapshotValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const upload = await ctx.db.get(args.uploadId);
    if (!upload || upload.errorMessage === "__removing__") return;

    const version = upload.version;

    const spreadsheetId = await ctx.db.insert("spreadsheets", {
      userId: args.userId,
      uploadId: args.uploadId,
      name: args.fileName,
      version,
      totalSheets: args.sheetCount,
      totalRows: args.rowCount,
      createdAt: now,
      updatedAt: now,
    });

    for (const sheet of args.sheets) {
      const worksheetId = await ctx.db.insert("worksheets", {
        userId: args.userId,
        spreadsheetId,
        uploadId: args.uploadId,
        name: sheet.name,
        headerRowIndex: sheet.headerRowIndex,
        dataStartRowIndex: sheet.dataStartRowIndex,
        headers: sheet.headers,
        rowCount: sheet.rowCount,
        createdAt: now,
      });

      await ctx.db.insert("mappings", {
        userId: args.userId,
        worksheetId,
        uploadId: args.uploadId,
        version,
        mappings: sheet.mappings,
        createdAt: now,
      });

      const batchSize = 100;
      for (let i = 0; i < sheet.rows.length; i += batchSize) {
        const batch = sheet.rows.slice(i, i + batchSize);
        for (const row of batch) {
          await ctx.db.insert("normalized_records", {
            userId: args.userId,
            uploadId: args.uploadId,
            spreadsheetId,
            worksheetId,
            sourceRowIndex: row.sourceRowIndex,
            data: row.data,
            version,
            createdAt: now,
          });
        }
      }
    }

    await ctx.db.insert("dashboards", {
      userId: args.userId,
      uploadId: args.uploadId,
      name: `Dashboard — ${args.fileName}`,
      type: "upload",
      snapshot: args.snapshot,
      createdAt: now,
      updatedAt: now,
    });

    const existingGlobal = await ctx.db
      .query("dashboards")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("type", "global")
      )
      .first();

    if (!existingGlobal) {
      await ctx.db.insert("dashboards", {
        userId: args.userId,
        name: "Dashboard Geral",
        type: "global",
        snapshot: args.snapshot,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existingGlobal._id, {
        snapshot: args.snapshot,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.uploadId, {
      status: "completed",
      shopping: args.shopping,
      parserType: args.parserType,
      profileId: args.profileId,
      parseWarnings: args.parseWarnings,
      sheetCount: args.sheetCount,
      rowCount: args.rowCount,
      processedAt: now,
      updatedAt: now,
    });

    await logAudit(ctx, {
      userId: args.userId,
      entityType: "upload",
      entityId: args.uploadId,
      action: "processed",
      metadata: {
        rows: String(args.rowCount),
        sheets: String(args.sheetCount),
      },
    });
  },
});
