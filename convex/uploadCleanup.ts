import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

const RECORD_BATCH = 250;

export const purgeUpload = internalMutation({
  args: {
    uploadId: v.id("uploads"),
    storageId: v.id("_storage"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const upload = await ctx.db.get(args.uploadId);
    if (!upload || upload.userId !== args.userId) return;

    const records = await ctx.db
      .query("normalized_records")
      .withIndex("by_upload", (q) => q.eq("uploadId", args.uploadId))
      .take(RECORD_BATCH);

    for (const record of records) {
      await ctx.db.delete(record._id);
    }

    if (records.length === RECORD_BATCH) {
      await ctx.scheduler.runAfter(0, internal.uploadCleanup.purgeUpload, args);
      return;
    }

    const mappings = await ctx.db
      .query("mappings")
      .withIndex("by_upload", (q) => q.eq("uploadId", args.uploadId))
      .collect();
    for (const m of mappings) {
      await ctx.db.delete(m._id);
    }

    const worksheets = await ctx.db
      .query("worksheets")
      .withIndex("by_upload", (q) => q.eq("uploadId", args.uploadId))
      .collect();
    for (const w of worksheets) {
      await ctx.db.delete(w._id);
    }

    const spreadsheets = await ctx.db
      .query("spreadsheets")
      .withIndex("by_upload", (q) => q.eq("uploadId", args.uploadId))
      .collect();
    for (const s of spreadsheets) {
      await ctx.db.delete(s._id);
    }

    const dashboards = await ctx.db
      .query("dashboards")
      .withIndex("by_upload", (q) => q.eq("uploadId", args.uploadId))
      .collect();
    for (const d of dashboards) {
      await ctx.db.delete(d._id);
    }

    const presentations = await ctx.db
      .query("presentations")
      .withIndex("by_upload", (q) => q.eq("uploadId", args.uploadId))
      .collect();
    for (const p of presentations) {
      if (p.storageId) {
        await ctx.storage.delete(p.storageId);
      }
      await ctx.db.delete(p._id);
    }

    try {
      await ctx.storage.delete(args.storageId);
    } catch {
      // Arquivo já removido ou inexistente
    }

    await ctx.db.delete(args.uploadId);
  },
});
