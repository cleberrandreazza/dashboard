import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  createAccount,
  getAuthUserId,
  invalidateSessions,
} from "@convex-dev/auth/server";
import { USER_DELETED_ERROR } from "./lib/auth";

function validatePassword(password: string) {
  if (!password || password.length < 8) {
    throw new Error("A senha deve ter no mínimo 8 caracteres.");
  }
}

function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error("E-mail inválido.");
  }
  return trimmed;
}

/** Usuário autenticado atual */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return { deleted: true as const };
    return {
      deleted: false as const,
      _id: user._id,
      email: user.email ?? "",
      name: user.name ?? "",
    };
  },
});

/** Lista usuários — apenas para quem está autenticado */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Não autenticado");
    }
    const actor = await ctx.db.get(userId);
    if (!actor) {
      throw new Error(USER_DELETED_ERROR);
    }

    const users = await ctx.db.query("users").collect();
    return users
      .map((u) => ({
        _id: u._id,
        email: u.email ?? "",
        name: u.name ?? "",
        createdAt: u._creationTime,
        isSelf: u._id === userId,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Remove usuário, invalida sessões e apaga dados — somente outro usuário logado */
export const remove = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const actorId = await getAuthUserId(ctx);
    if (!actorId) {
      throw new Error("Faça login para remover usuários.");
    }

    const actor = await ctx.runQuery(internal.usersInternal.getUserById, {
      userId: actorId,
    });
    if (!actor) {
      throw new Error(USER_DELETED_ERROR);
    }

    await invalidateSessions(ctx, { userId: args.userId });

    await ctx.runMutation(internal.usersInternal.removeUserData, {
      actorId,
      targetUserId: args.userId,
    });

    return { ok: true };
  },
});

/** Cria conta com senha — somente usuário já logado */
export const createUser = action({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const creatorId = await getAuthUserId(ctx);
    if (!creatorId) {
      throw new Error("Faça login para cadastrar novos usuários.");
    }

    const email = normalizeEmail(args.email);
    validatePassword(args.password);

    const existing = await ctx.runQuery(internal.usersInternal.findByEmail, {
      email,
    });
    if (existing) {
      throw new Error("Este e-mail já está cadastrado.");
    }

    const { user } = await createAccount(ctx, {
      provider: "password",
      account: { id: email, secret: args.password },
      profile: {
        email,
        name: args.name?.trim() || email.split("@")[0],
      },
    });

    await ctx.runMutation(internal.usersInternal.logUserCreated, {
      creatorId,
      newUserId: user._id,
      email,
    });

    return { userId: user._id, email };
  },
});
