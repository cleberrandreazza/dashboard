/** Layout types detected per worksheet */
export type SheetLayout =
  | "matrix_metrics" // métricas nas linhas, meses nas colunas
  | "table_records" // cabeçalho + linhas (Influs)
  | "metadata" // links / instruções — ignorar
  | "unknown";

export type DataDomain =
  | "social_media"
  | "analytics"
  | "multi_app"
  | "shopping"
  | "influencers"
  | "vendors"
  | "venue"
  | "insights"
  | "unknown";

export interface SheetRule {
  /** Match parcial ou exato do nome da aba */
  sheetPattern: string;
  domain: DataDomain;
  layout: SheetLayout;
  skip?: boolean;
}

export interface ParsingProfile {
  id: string;
  name: string;
  description?: string;
  /** Regex para extrair shopping do nome do arquivo, ex: (PKB|BSS|PCN) */
  shoppingFromFileRegex: string;
  sheetRules: SheetRule[];
  platformAliases?: Record<string, string>;
}

export interface MultiplanRecord {
  shopping: string;
  domain: DataDomain;
  sheet_name: string;
  platform: string | null;
  metric_name: string;
  period_label: string;
  year: number;
  month: number;
  value: number | string | null;
  value_type: "number" | "currency" | "text";
  source_row: number;
  source_col: number;
  extra?: Record<string, string | number | null>;
}

export interface MultiplanParseResult {
  shopping: string;
  fileName: string;
  profileId: string;
  records: MultiplanRecord[];
  sheetsProcessed: string[];
  sheetsSkipped: string[];
  warnings: string[];
}
