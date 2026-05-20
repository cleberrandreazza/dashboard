import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export const DEFAULT_MULTIPLAN_PROFILE_ID = "multiplan_regional_sul";

export async function ensureDefaultMultiplanProfile(
  ctx: MutationCtx,
  userId: Id<"users">
): Promise<Id<"sheet_profiles">> {
  const existing = await ctx.db
    .query("sheet_profiles")
    .withIndex("by_profile_id", (q) =>
      q.eq("userId", userId).eq("profileId", DEFAULT_MULTIPLAN_PROFILE_ID)
    )
    .first();
  if (existing) return existing._id;

  const now = Date.now();
  return await ctx.db.insert("sheet_profiles", {
    userId,
    profileId: DEFAULT_MULTIPLAN_PROFILE_ID,
    name: "Multiplan Regional Sul",
    description:
      "Perfil para planilhas PKB, BSS e PCN — abas matriciais e Influs.",
    isDefault: true,
    config: {
      shoppingFromFileRegex: "(PKB|BSS|PCN)",
      platformAliases: { ig: "Instagram", insta: "Instagram", fb: "Facebook" },
      sheetRules: [
        { sheetPattern: "onde buscar", domain: "unknown", layout: "metadata", skip: true },
        { sheetPattern: "Redes Sociais", domain: "social_media", layout: "matrix_metrics" },
        { sheetPattern: "Analytics", domain: "analytics", layout: "matrix_metrics" },
        { sheetPattern: "Multi", domain: "multi_app", layout: "matrix_metrics" },
        { sheetPattern: "Shopping", domain: "shopping", layout: "matrix_metrics" },
        { sheetPattern: "Influs", domain: "influencers", layout: "table_records" },
        { sheetPattern: "Fornecedores", domain: "vendors", layout: "matrix_metrics" },
        { sheetPattern: "Barracadabra", domain: "venue", layout: "matrix_metrics" },
        { sheetPattern: "Parque do Park", domain: "venue", layout: "matrix_metrics" },
      ],
    },
    createdAt: now,
    updatedAt: now,
  });
}
