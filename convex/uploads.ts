import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth, assertOwnership } from "./lib/auth";
import { logAudit } from "./lib/audit";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    storageId: v.id("_storage"),
    parserType: v.optional(v.union(v.literal("multiplan"), v.literal("generic"))),
    profileId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const now = Date.now();

    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (
      !allowed.includes(args.mimeType) &&
      !args.fileName.match(/\.(xlsx|xls)$/i)
    ) {
      throw new Error("Formato inválido. Use arquivos .xlsx ou .xls");
    }

    if (args.fileSize > 50 * 1024 * 1024) {
      throw new Error("Arquivo excede o limite de 50MB");
    }

    const isMultiplan = /(PKB|BSS|PCN)/i.test(args.fileName);
    const parserType = args.parserType ?? (isMultiplan ? "multiplan" : "generic");

    if (parserType === "multiplan") {
      await ctx.runMutation(internal.sheetProfiles.ensureDefaultInternal, {
        userId,
      });
    }

    const uploadId = await ctx.db.insert("uploads", {
      userId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      storageId: args.storageId,
      status: "pending",
      parserType,
      profileId: args.profileId ?? (parserType === "multiplan" ? "multiplan_regional_sul" : undefined),
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(uploadId, { status: "processing", updatedAt: Date.now() });

    await ctx.scheduler.runAfter(0, internal.processing.processUpload, {
      uploadId,
    });

    await logAudit(ctx, {
      userId,
      entityType: "upload",
      entityId: uploadId,
      action: "created",
      metadata: { fileName: args.fileName },
    });

    return uploadId;
  },
});

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("uploads")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

export const get = query({
  args: { uploadId: v.id("uploads") },
  handler: async (ctx, args) => {
    const upload = await ctx.db.get(args.uploadId);
    if (!upload) return null;
    await assertOwnership(ctx, upload.userId);
    return upload;
  },
});

export const getWorksheets = query({
  args: { uploadId: v.id("uploads") },
  handler: async (ctx, args) => {
    const upload = await ctx.db.get(args.uploadId);
    if (!upload) return [];
    await assertOwnership(ctx, upload.userId);
    return await ctx.db
      .query("worksheets")
      .withIndex("by_upload", (q) => q.eq("uploadId", args.uploadId))
      .collect();
  },
});

export const getMappings = query({
  args: { uploadId: v.id("uploads") },
  handler: async (ctx, args) => {
    const upload = await ctx.db.get(args.uploadId);
    if (!upload) return [];
    await assertOwnership(ctx, upload.userId);
    return await ctx.db
      .query("mappings")
      .withIndex("by_upload", (q) => q.eq("uploadId", args.uploadId))
      .collect();
  },
});

export const getFileUrl = query({
  args: { uploadId: v.id("uploads") },
  handler: async (ctx, args) => {
    const upload = await ctx.db.get(args.uploadId);
    if (!upload) return null;
    await assertOwnership(ctx, upload.userId);
    return await ctx.storage.getUrl(upload.storageId);
  },
});

export const remove = mutation({
  args: { uploadId: v.id("uploads") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const upload = await ctx.db.get(args.uploadId);
    if (!upload) {
      throw new Error("Upload não encontrado");
    }
    await assertOwnership(ctx, upload.userId);

    if (upload.errorMessage === "__removing__") {
      return { ok: true, alreadyRemoving: true };
    }

    await ctx.db.patch(args.uploadId, {
      status: "processing",
      errorMessage: "__removing__",
      updatedAt: Date.now(),
    });

    await logAudit(ctx, {
      userId,
      entityType: "upload",
      entityId: args.uploadId,
      action: "delete_scheduled",
      metadata: { fileName: upload.fileName },
    });

    await ctx.scheduler.runAfter(0, internal.uploadCleanup.purgeUpload, {
      uploadId: args.uploadId,
      storageId: upload.storageId,
      userId,
    });

    return { ok: true };
  },
});
