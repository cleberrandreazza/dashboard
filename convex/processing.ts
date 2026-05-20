"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { parseMultiplanWorkbook, multiplanToNormalizedData } from "../shared/multiplan/workbookParser";
import { MULTIPLAN_DEFAULT_PROFILE } from "../shared/multiplan/defaultProfile";
import { buildExecutiveAnalytics } from "../shared/multiplan/insights";
import {
  applyGovernance,
  mergeParseWarnings,
} from "../shared/multiplan/governance";
import type { ParsingProfile } from "../shared/multiplan/types";
import { parseWorkbookFromArrayBuffer } from "../shared/parser";
import { runWorkbookEtl } from "../shared/etl";
import { buildDashboardSnapshot } from "../shared/insights";
import type { ParsedRow } from "../shared/types";

function dbProfileToParsingProfile(
  row: {
    profileId: string;
    name: string;
    config: {
      shoppingFromFileRegex: string;
      sheetRules: Array<{
        sheetPattern: string;
        domain: string;
        layout: string;
        skip?: boolean;
      }>;
      platformAliases?: Record<string, string>;
    };
  } | null
): ParsingProfile {
  if (!row) return MULTIPLAN_DEFAULT_PROFILE;
  return {
    id: row.profileId,
    name: row.name,
    sheetRules: row.config.sheetRules.map((r) => ({
      sheetPattern: r.sheetPattern,
      domain: r.domain as ParsingProfile["sheetRules"][0]["domain"],
      layout: r.layout as ParsingProfile["sheetRules"][0]["layout"],
      skip: r.skip,
    })),
    shoppingFromFileRegex: row.config.shoppingFromFileRegex,
    platformAliases: row.config.platformAliases,
  };
}

export const processUpload = internalAction({
  args: { uploadId: v.id("uploads") },
  handler: async (ctx, args) => {
    try {
      const upload = await ctx.runQuery(
        internal.processingMutations.getUploadInternal,
        { uploadId: args.uploadId }
      );
      if (!upload) throw new Error("Upload não encontrado");
      if (upload.errorMessage === "__removing__") return;

      const blob = await ctx.storage.get(upload.storageId);
      if (!blob) throw new Error("Arquivo não encontrado no storage");

      const buffer = await blob.arrayBuffer();
      const parserType = upload.parserType ?? "multiplan";

      if (parserType === "multiplan") {
        let profileRow = null;
        if (upload.profileId) {
          profileRow = await ctx.runQuery(
            internal.processingMutations.getProfileInternal,
            { userId: upload.userId, profileId: upload.profileId }
          );
        } else {
          profileRow = await ctx.runQuery(
            internal.processingMutations.getDefaultProfileInternal,
            { userId: upload.userId }
          );
        }

        const profile = dbProfileToParsingProfile(profileRow);
        const parsed = parseMultiplanWorkbook(
          buffer,
          upload.fileName,
          profile
        );
        const governance = applyGovernance(parsed);
        const result = {
          ...parsed,
          records: governance.records,
          warnings: mergeParseWarnings(parsed.warnings, governance),
        };

        const regionalSnapshot = buildExecutiveAnalytics(result.records);

        const MULTIPLAN_HEADERS = [
          "shopping",
          "domain",
          "sheet_name",
          "platform",
          "metric_name",
          "period_label",
          "year",
          "month",
          "value",
          "value_type",
        ];

        const sheets = [
          {
            name: "consolidated",
            headerRowIndex: 0,
            dataStartRowIndex: 0,
            headers: MULTIPLAN_HEADERS,
            rowCount: governance.records.length,
            mappings: [],
            rows: governance.records.map((rec, idx) => ({
              sourceRowIndex: idx,
              data: multiplanToNormalizedData(rec),
            })),
          },
        ];

        await ctx.runMutation(internal.processingMutations.persistProcessing, {
          uploadId: args.uploadId,
          userId: upload.userId,
          fileName: upload.fileName,
          shopping: result.shopping,
          parserType: "multiplan",
          profileId: profile.id,
          parseWarnings: result.warnings,
          sheetCount: result.sheetsProcessed.length,
          rowCount: governance.records.length,
          sheets,
          snapshot: regionalSnapshot,
        });
        return;
      }

      // Parser genérico (fallback)
      const parsed = parseWorkbookFromArrayBuffer(buffer);
      const etlSheets = runWorkbookEtl(parsed.sheets);
      const allRows: ParsedRow[] = [];
      const sheetMeta: Array<{
        name: string;
        headerRowIndex: number;
        dataStartRowIndex: number;
        headers: string[];
        rowCount: number;
        mappings: Array<{
          sourceColumn: string;
          canonicalField: string;
          confidence: number;
          dataType: string;
        }>;
        rows: Array<{
          sourceRowIndex: number;
          data: Record<string, string | number | boolean | null>;
        }>;
      }> = [];

      for (const sheet of etlSheets) {
        allRows.push(...sheet.rows);
        sheetMeta.push({
          name: sheet.name,
          headerRowIndex: sheet.headerRowIndex,
          dataStartRowIndex: sheet.dataStartRowIndex,
          headers: sheet.headers,
          rowCount: sheet.rows.length,
          mappings: sheet.mappings.map((m) => ({
            sourceColumn: m.sourceColumn,
            canonicalField: m.canonicalField,
            confidence: m.confidence,
            dataType: m.dataType,
          })),
          rows: sheet.rows.map((r) => ({
            sourceRowIndex: r.sourceRowIndex,
            data: Object.fromEntries(
              Object.entries(r.normalized).map(([k, val]) => [
                k,
                val === undefined ? null : (val as string | number | boolean | null),
              ])
            ),
          })),
        });
      }

      const snapshot = buildDashboardSnapshot(allRows);

      await ctx.runMutation(internal.processingMutations.persistProcessing, {
        uploadId: args.uploadId,
        userId: upload.userId,
        fileName: upload.fileName,
        shopping: undefined,
        parserType: "generic",
        profileId: undefined,
        parseWarnings: [],
        sheetCount: etlSheets.length,
        rowCount: allRows.length,
        sheets: sheetMeta,
        snapshot,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro no processamento";
      await ctx.runMutation(internal.processingMutations.markFailed, {
        uploadId: args.uploadId,
        errorMessage: message,
      });
    }
  },
});
