import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export async function logAudit(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    entityType: string;
    entityId: string;
    action: string;
    metadata?: Record<string, string>;
  }
): Promise<void> {
  await ctx.db.insert("audit_logs", {
    userId: args.userId,
    entityType: args.entityType,
    entityId: args.entityId,
    action: args.action,
    metadata: args.metadata,
    createdAt: Date.now(),
  });
}
