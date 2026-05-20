import type { MultiplanRecord, MultiplanParseResult } from "./types";
import { KNOWN_SHOPPINGS } from "./metricCatalog";

export interface GovernanceIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
}

export interface GovernanceReport {
  valid: boolean;
  issues: GovernanceIssue[];
  dedupedCount: number;
  records: MultiplanRecord[];
}

function recordFingerprint(r: MultiplanRecord): string {
  return [
    r.shopping,
    r.domain,
    r.sheet_name,
    r.platform ?? "",
    r.metric_name,
    r.year,
    r.month,
    r.period_label,
  ].join("|");
}

export function applyGovernance(
  result: MultiplanParseResult
): GovernanceReport {
  const issues: GovernanceIssue[] = [];
  const seen = new Map<string, MultiplanRecord>();
  let dedupedCount = 0;

  for (const r of result.records) {
    if (!r.year || !r.month) {
      issues.push({
        severity: "warning",
        code: "MISSING_PERIOD",
        message: `Métrica sem ano/mês: ${r.metric_name} (${r.sheet_name})`,
      });
    }

    if (
      r.shopping &&
      !KNOWN_SHOPPINGS.includes(
        r.shopping as (typeof KNOWN_SHOPPINGS)[number]
      )
    ) {
      issues.push({
        severity: "info",
        code: "UNKNOWN_SHOPPING",
        message: `Shopping "${r.shopping}" fora da lista padrão (PKB/BSS/PCN) — será aceito para expansão futura.`,
      });
    }

    const fp = recordFingerprint(r);
    const existing = seen.get(fp);
    if (existing) {
      dedupedCount++;
      const existingVal = Number(existing.value) || 0;
      const newVal = Number(r.value) || 0;
      if (newVal > existingVal) seen.set(fp, r);
      continue;
    }
    seen.set(fp, r);
  }

  if (dedupedCount > 0) {
    issues.push({
      severity: "warning",
      code: "DUPLICATE_ROWS",
      message: `${dedupedCount} registros duplicados removidos (mesma métrica/período/plataforma).`,
    });
  }

  const errors = issues.filter((i) => i.severity === "error");
  return {
    valid: errors.length === 0,
    issues,
    dedupedCount,
    records: [...seen.values()],
  };
}

export function mergeParseWarnings(
  parseWarnings: string[],
  governance: GovernanceReport
): string[] {
  return [
    ...parseWarnings,
    ...governance.issues.map((i) => `[${i.code}] ${i.message}`),
  ];
}
