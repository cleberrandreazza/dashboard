import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { logAudit } from "./lib/audit";

export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const findByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const logUserCreated = internalMutation({
  args: {
    creatorId: v.id("users"),
    newUserId: v.id("users"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    await logAudit(ctx, {
      userId: args.creatorId,
      entityType: "user",
      entityId: args.newUserId,
      action: "created",
      metadata: { email: args.email },
    });
  },
});

async function deleteAuthForUser(ctx: MutationCtx, userId: Id<"users">) {
  const sessions = await ctx.db
    .query("authSessions")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .collect();

  for (const session of sessions) {
    const refreshTokens = await ctx.db
      .query("authRefreshTokens")
      .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
      .collect();
    for (const token of refreshTokens) {
      await ctx.db.delete(token._id);
    }

    const verifiers = await ctx.db
      .query("authVerifiers")
      .filter((q) => q.eq(q.field("sessionId"), session._id))
      .collect();
    for (const verifier of verifiers) {
      await ctx.db.delete(verifier._id);
    }

    await ctx.db.delete(session._id);
  }

  const accounts = await ctx.db
    .query("authAccounts")
    .filter((q) => q.eq(q.field("userId"), userId))
    .collect();

  for (const account of accounts) {
    const codes = await ctx.db
      .query("authVerificationCodes")
      .withIndex("accountId", (q) => q.eq("accountId", account._id))
      .collect();
    for (const code of codes) {
      await ctx.db.delete(code._id);
    }
    await ctx.db.delete(account._id);
  }
}

async function scheduleUploadPurges(ctx: MutationCtx, userId: Id<"users">) {
  const uploads = await ctx.db
    .query("uploads")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  for (const upload of uploads) {
    if (upload.errorMessage === "__removing__") continue;
    await ctx.db.patch(upload._id, {
      status: "processing",
      errorMessage: "__removing__",
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.uploadCleanup.purgeUpload, {
      uploadId: upload._id,
      storageId: upload.storageId,
      userId,
    });
  }
}

async function deleteUserAppData(ctx: MutationCtx, userId: Id<"users">) {
  const profiles = await ctx.db
    .query("sheet_profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const p of profiles) {
    await ctx.db.delete(p._id);
  }

  const lookerExports = await ctx.db
    .query("looker_exports")
    .withIndex("by_user_created", (q) => q.eq("userId", userId))
    .collect();
  for (const exp of lookerExports) {
    if (exp.storageId) {
      try {
        await ctx.storage.delete(exp.storageId);
      } catch {
        // ignore
      }
    }
    await ctx.db.delete(exp._id);
  }

  const dashboards = await ctx.db
    .query("dashboards")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const d of dashboards) {
    await ctx.db.delete(d._id);
  }

  const presentations = await ctx.db
    .query("presentations")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const p of presentations) {
    if (p.storageId) {
      try {
        await ctx.storage.delete(p.storageId);
      } catch {
        // ignore
      }
    }
    await ctx.db.delete(p._id);
  }

  const auditLogs = await ctx.db
    .query("audit_logs")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const log of auditLogs) {
    await ctx.db.delete(log._id);
  }
}

export const removeUserData = internalMutation({
  args: {
    actorId: v.id("users"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.targetUserId);
    if (!target) {
      throw new Error("Usuário não encontrado");
    }

    const userCount = (await ctx.db.query("users").collect()).length;
    if (userCount <= 1) {
      throw new Error("Não é possível remover o último usuário do sistema.");
    }

    if (args.actorId === args.targetUserId) {
      throw new Error("Você não pode remover sua própria conta.");
    }

    await scheduleUploadPurges(ctx, args.targetUserId);
    await deleteUserAppData(ctx, args.targetUserId);
    await deleteAuthForUser(ctx, args.targetUserId);

    const email = target.email ?? "";
    await ctx.db.delete(args.targetUserId);

    if (email) {
      const rateLimits = await ctx.db
        .query("authRateLimits")
        .withIndex("identifier", (q) => q.eq("identifier", email))
        .collect();
      for (const rl of rateLimits) {
        await ctx.db.delete(rl._id);
      }
    }

    await logAudit(ctx, {
      userId: args.actorId,
      entityType: "user",
      entityId: args.targetUserId,
      action: "deleted",
      metadata: { email },
    });
  },
});
