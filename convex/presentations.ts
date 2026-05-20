import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, assertOwnership } from "./lib/auth";
import { logAudit } from "./lib/audit";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);
    return await ctx.db
      .query("presentations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    uploadId: v.optional(v.id("uploads")),
    dashboardId: v.optional(v.id("dashboards")),
    format: v.union(v.literal("pptx"), v.literal("pdf")),
    slides: v.array(
      v.object({
        type: v.string(),
        title: v.string(),
        content: v.optional(v.string()),
      })
    ),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const now = Date.now();

    const id = await ctx.db.insert("presentations", {
      userId,
      uploadId: args.uploadId,
      dashboardId: args.dashboardId,
      title: args.title,
      format: args.format,
      storageId: args.storageId,
      status: args.storageId ? "ready" : "pending",
      slides: args.slides,
      createdAt: now,
      updatedAt: now,
    });

    await logAudit(ctx, {
      userId,
      entityType: "presentation",
      entityId: id,
      action: "created",
      metadata: { format: args.format },
    });

    return id;
  },
});

export const getFileUrl = query({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    const pres = await ctx.db.get(args.presentationId);
    if (!pres?.storageId) return null;
    await assertOwnership(ctx, pres.userId);
    return await ctx.storage.getUrl(pres.storageId);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
