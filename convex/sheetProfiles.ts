import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { ensureDefaultMultiplanProfile } from "./lib/sheetProfileSeed";

const profileConfigValidator = v.object({
  shoppingFromFileRegex: v.string(),
  sheetRules: v.array(
    v.object({
      sheetPattern: v.string(),
      domain: v.string(),
      layout: v.string(),
      skip: v.optional(v.boolean()),
    })
  ),
  platformAliases: v.optional(v.record(v.string(), v.string())),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);
    return await ctx.db
      .query("sheet_profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const get = query({
  args: { profileId: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    return await ctx.db
      .query("sheet_profiles")
      .withIndex("by_profile_id", (q) =>
        q.eq("userId", userId).eq("profileId", args.profileId)
      )
      .first();
  },
});

export const getDefault = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);
    return await ctx.db
      .query("sheet_profiles")
      .withIndex("by_user_default", (q) =>
        q.eq("userId", userId).eq("isDefault", true)
      )
      .first();
  },
});

export const upsert = mutation({
  args: {
    profileId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    isDefault: v.boolean(),
    config: profileConfigValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const now = Date.now();

    if (!args.profileId.trim()) {
      throw new Error("ID do perfil é obrigatório");
    }
    if (!args.name.trim()) {
      throw new Error("Nome do perfil é obrigatório");
    }
    if (args.config.sheetRules.length === 0) {
      throw new Error("Adicione pelo menos uma regra de aba");
    }

    if (args.isDefault) {
      const existing = await ctx.db
        .query("sheet_profiles")
        .withIndex("by_user_default", (q) =>
          q.eq("userId", userId).eq("isDefault", true)
        )
        .collect();
      for (const p of existing) {
        if (p.profileId !== args.profileId) {
          await ctx.db.patch(p._id, { isDefault: false, updatedAt: now });
        }
      }
    }

    const found = await ctx.db
      .query("sheet_profiles")
      .withIndex("by_profile_id", (q) =>
        q.eq("userId", userId).eq("profileId", args.profileId)
      )
      .first();

    if (found) {
      await ctx.db.patch(found._id, {
        name: args.name,
        description: args.description,
        isDefault: args.isDefault,
        config: args.config,
        updatedAt: now,
      });
      return found._id;
    }

    return await ctx.db.insert("sheet_profiles", {
      userId,
      profileId: args.profileId,
      name: args.name,
      description: args.description,
      isDefault: args.isDefault,
      config: args.config,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: { profileId: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const found = await ctx.db
      .query("sheet_profiles")
      .withIndex("by_profile_id", (q) =>
        q.eq("userId", userId).eq("profileId", args.profileId)
      )
      .first();

    if (!found) throw new Error("Perfil não encontrado");
    if (found.profileId === "multiplan_regional_sul") {
      throw new Error("O perfil padrão Multiplan não pode ser excluído");
    }

    await ctx.db.delete(found._id);
  },
});

export const seedMultiplanDefault = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);
    return await ensureDefaultMultiplanProfile(ctx, userId);
  },
});

export const ensureDefaultInternal = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ensureDefaultMultiplanProfile(ctx, args.userId);
  },
});
