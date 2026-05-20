import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type { MultiplanRecord } from "../../shared/multiplan/types";

export async function loadUserMultiplanRecords(
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<MultiplanRecord[]> {
  const uploads = await ctx.db
    .query("uploads")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("status"), "completed"))
    .collect();

  const multiplanUploads = uploads.filter(
    (u) => u.parserType === "multiplan" || u.shopping
  );

  const records: MultiplanRecord[] = [];

  for (const upload of multiplanUploads) {
    const rows = await ctx.db
      .query("normalized_records")
      .withIndex("by_upload", (q) => q.eq("uploadId", upload._id))
      .take(8000);

    for (const row of rows) {
      const d = row.data;
      records.push({
        shopping: String(d.shopping ?? upload.shopping ?? "UNKNOWN"),
        domain: (d.domain as MultiplanRecord["domain"]) ?? "unknown",
        sheet_name: String(d.sheet_name ?? ""),
        platform: d.platform ? String(d.platform) : null,
        metric_name: String(d.metric_name ?? ""),
        period_label: String(d.period_label ?? ""),
        year: Number(d.year ?? 0),
        month: Number(d.month ?? 0),
        value:
          typeof d.value === "number"
            ? d.value
            : d.value === null
              ? null
              : String(d.value),
        value_type: (d.value_type as MultiplanRecord["value_type"]) ?? "text",
        source_row: row.sourceRowIndex,
        source_col: 0,
      });
    }
  }

  return records;
}
