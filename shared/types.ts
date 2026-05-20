/** Canonical field keys used after normalization */
export type CanonicalField =
  | "customer_name"
  | "product_name"
  | "category"
  | "amount"
  | "quantity"
  | "date"
  | "region"
  | "status"
  | "email"
  | "phone"
  | "sku"
  | "unknown";

export type DataType = "string" | "number" | "date" | "boolean" | "currency" | "unknown";

export interface ColumnMapping {
  sourceColumn: string;
  canonicalField: CanonicalField;
  confidence: number;
  dataType: DataType;
}

export interface ParsedRow {
  sourceRowIndex: number;
  raw: Record<string, unknown>;
  normalized: Record<string, unknown>;
}

export interface ParsedSheet {
  name: string;
  headers: string[];
  headerRowIndex: number;
  dataStartRowIndex: number;
  rows: ParsedRow[];
  mappings: ColumnMapping[];
}

export interface ParsedWorkbook {
  sheets: ParsedSheet[];
  totalRows: number;
}

export interface InsightItem {
  id: string;
  type: "summary" | "trend" | "alert" | "anomaly" | "growth" | "comparison";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  metric?: string;
  value?: number;
  changePercent?: number;
}

export interface DashboardKpi {
  key: string;
  label: string;
  value: number;
  format: "number" | "currency" | "percent";
  changePercent?: number;
}

export interface ChartSeriesPoint {
  label: string;
  value: number;
}

export interface DashboardSnapshot {
  kpis: DashboardKpi[];
  timeSeries: ChartSeriesPoint[];
  byCategory: ChartSeriesPoint[];
  byRegion: ChartSeriesPoint[];
  insights: InsightItem[];
}

export type { ExecutiveAnalytics, CompareGranularity, PeriodComparison } from "./multiplan/historicalAnalytics";
