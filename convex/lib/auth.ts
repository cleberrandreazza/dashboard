import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

/** Erro quando o JWT ainda existe mas o usuário foi removido do banco */
export const USER_DELETED_ERROR = "USER_DELETED";

export async function requireAuth(
  ctx: QueryCtx | MutationCtx
): Promise<{ userId: Id<"users">; tokenIdentifier: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Não autenticado");
  }

  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Não autenticado");
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error(USER_DELETED_ERROR);
  }

  return { userId, tokenIdentifier: identity.tokenIdentifier };
}

export async function getUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<Doc<"users"> | null> {
  return await ctx.db.get(userId);
}

export async function requireUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const { userId } = await requireAuth(ctx);
  const user = await getUser(ctx, userId);
  if (!user) throw new Error("Usuário não encontrado");
  return user;
}

export async function assertOwnership(
  ctx: QueryCtx | MutationCtx,
  resourceUserId: Id<"users">
): Promise<void> {
  const { userId } = await requireAuth(ctx);
  if (resourceUserId !== userId) {
    throw new Error("Acesso não autorizado");
  }
}
