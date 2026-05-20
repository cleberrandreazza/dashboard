import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { dashboardSnapshotValidator } from "./lib/snapshotValidator";

const uploadStatus = v.union(
  v.literal("pending"),
  v.literal("uploading"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed")
);

const presentationFormat = v.union(v.literal("pptx"), v.literal("pdf"));

const columnMappingValidator = v.object({
  sourceColumn: v.string(),
  canonicalField: v.string(),
  confidence: v.number(),
  dataType: v.string(),
});

export default defineSchema({
  ...authTables,

  sheet_profiles: defineTable({
    userId: v.id("users"),
    profileId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    isDefault: v.boolean(),
    config: v.object({
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
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_default", ["userId", "isDefault"])
    .index("by_profile_id", ["userId", "profileId"]),

  uploads: defineTable({
    userId: v.id("users"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    storageId: v.id("_storage"),
    status: uploadStatus,
    errorMessage: v.optional(v.string()),
    sheetCount: v.optional(v.number()),
    rowCount: v.optional(v.number()),
    shopping: v.optional(v.string()),
    parserType: v.optional(v.union(v.literal("multiplan"), v.literal("generic"))),
    profileId: v.optional(v.string()),
    parseWarnings: v.optional(v.array(v.string())),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    processedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_user_created", ["userId", "createdAt"]),

  spreadsheets: defineTable({
    userId: v.id("users"),
    uploadId: v.id("uploads"),
    name: v.string(),
    version: v.number(),
    totalSheets: v.number(),
    totalRows: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_upload", ["uploadId"])
    .index("by_user", ["userId"]),

  worksheets: defineTable({
    userId: v.id("users"),
    spreadsheetId: v.id("spreadsheets"),
    uploadId: v.id("uploads"),
    name: v.string(),
    headerRowIndex: v.number(),
    dataStartRowIndex: v.number(),
    headers: v.array(v.string()),
    rowCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_spreadsheet", ["spreadsheetId"])
    .index("by_upload", ["uploadId"]),

  mappings: defineTable({
    userId: v.id("users"),
    worksheetId: v.id("worksheets"),
    uploadId: v.id("uploads"),
    version: v.number(),
    mappings: v.array(columnMappingValidator),
    createdAt: v.number(),
  })
    .index("by_worksheet", ["worksheetId"])
    .index("by_upload", ["uploadId"]),

  normalized_records: defineTable({
    userId: v.id("users"),
    uploadId: v.id("uploads"),
    spreadsheetId: v.id("spreadsheets"),
    worksheetId: v.id("worksheets"),
    sourceRowIndex: v.number(),
    data: v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null())),
    version: v.number(),
    createdAt: v.number(),
  })
    .index("by_upload", ["uploadId"])
    .index("by_worksheet", ["worksheetId"])
    .index("by_user", ["userId"])
    .index("by_upload_version", ["uploadId", "version"]),

  dashboards: defineTable({
    userId: v.id("users"),
    uploadId: v.optional(v.id("uploads")),
    name: v.string(),
    type: v.union(
      v.literal("global"),
      v.literal("upload"),
      v.literal("comparative"),
      v.literal("temporal")
    ),
    snapshot: dashboardSnapshotValidator,
    filters: v.optional(v.record(v.string(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_upload", ["uploadId"])
    .index("by_user_type", ["userId", "type"]),

  presentations: defineTable({
    userId: v.id("users"),
    uploadId: v.optional(v.id("uploads")),
    dashboardId: v.optional(v.id("dashboards")),
    title: v.string(),
    format: presentationFormat,
    storageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("ready"),
      v.literal("failed")
    ),
    slides: v.array(
      v.object({
        type: v.string(),
        title: v.string(),
        content: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_upload", ["uploadId"]),

  audit_logs: defineTable({
    userId: v.id("users"),
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
    metadata: v.optional(v.record(v.string(), v.string())),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  /** Snapshots CSV/JSON para Looker Studio */
  looker_exports: defineTable({
    userId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("ready"),
      v.literal("failed")
    ),
    format: v.union(v.literal("csv"), v.literal("json")),
    storageId: v.optional(v.id("_storage")),
    rowCount: v.number(),
    totalCount: v.optional(v.number()),
    truncated: v.optional(v.boolean()),
    fileName: v.string(),
    filters: v.optional(
      v.object({
        shopping: v.optional(v.string()),
        year: v.optional(v.number()),
        month: v.optional(v.number()),
        quarter: v.optional(v.number()),
      })
    ),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_user_created", ["userId", "createdAt"]),
});
