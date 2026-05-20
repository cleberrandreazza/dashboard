import * as XLSX from "xlsx";
import { MULTIPLAN_DEFAULT_PROFILE } from "./defaultProfile";
import { extractShoppingFromFileName } from "./platformNormalize";
import { parseMatrixSheet } from "./matrixParser";
import { parseInfluencersSheet } from "./influencersParser";
import type {
  MultiplanParseResult,
  MultiplanRecord,
  ParsingProfile,
  SheetLayout,
  SheetRule,
} from "./types";

function matchSheetRule(sheetName: string, rules: SheetRule[]): SheetRule | null {
  const normalized = sheetName.trim().toLowerCase();
  for (const rule of rules) {
    if (normalized.includes(rule.sheetPattern.toLowerCase())) return rule;
  }
  return null;
}

export function parseMultiplanWorkbook(
  buffer: ArrayBuffer,
  fileName: string,
  profile: ParsingProfile = MULTIPLAN_DEFAULT_PROFILE
): MultiplanParseResult {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const shopping =
    extractShoppingFromFileName(fileName, profile.shoppingFromFileRegex) ??
    "UNKNOWN";

  const records: MultiplanRecord[] = [];
  const sheetsProcessed: string[] = [];
  const sheetsSkipped: string[] = [];
  const warnings: string[] = [];

  if (shopping === "UNKNOWN") {
    warnings.push(
      `Shopping não detectado no arquivo "${fileName}". Use PKB, BSS ou PCN no nome.`
    );
  }

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    const rule = matchSheetRule(sheetName, profile.sheetRules);
    if (!rule) {
      warnings.push(`Aba sem regra no perfil: "${sheetName}" — ignorada.`);
      sheetsSkipped.push(sheetName);
      continue;
    }
    if (rule.skip || rule.layout === "metadata") {
      sheetsSkipped.push(sheetName);
      continue;
    }

    const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: null,
      raw: false,
    }) as unknown[][];

    let sheetRecords: MultiplanRecord[] = [];

    switch (rule.layout as SheetLayout) {
      case "matrix_metrics":
        sheetRecords = parseMatrixSheet(matrix, {
          shopping,
          sheetName,
          domain: rule.domain,
          aliases: profile.platformAliases,
        });
        break;
      case "table_records":
        if (rule.domain === "influencers") {
          sheetRecords = parseInfluencersSheet(matrix, { shopping, sheetName });
        }
        break;
      default:
        warnings.push(`Layout não suportado em "${sheetName}": ${rule.layout}`);
    }

    if (sheetRecords.length > 0) {
      records.push(...sheetRecords);
      sheetsProcessed.push(sheetName);
    } else {
      warnings.push(`Aba "${sheetName}" não gerou registros.`);
    }
  }

  return {
    shopping,
    fileName,
    profileId: profile.id,
    records,
    sheetsProcessed,
    sheetsSkipped,
    warnings,
  };
}

/** Converte registros Multiplan para formato genérico do banco (data record) */
export function multiplanToNormalizedData(
  record: MultiplanRecord
): Record<string, string | number | boolean | null> {
  return {
    shopping: record.shopping,
    domain: record.domain,
    sheet_name: record.sheet_name,
    platform: record.platform,
    metric_name: record.metric_name,
    period_label: record.period_label,
    year: record.year,
    month: record.month,
    value:
      typeof record.value === "number"
        ? record.value
        : record.value === null
          ? null
          : String(record.value),
    value_type: record.value_type,
    ...(record.extra ?? {}),
  };
}
