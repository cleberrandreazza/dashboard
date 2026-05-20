import * as XLSX from "xlsx";
import { mapColumns } from "./columnMapper";
import type { ParsedSheet, ParsedWorkbook, ParsedRow } from "./types";

function isEmptyRow(row: unknown[]): boolean {
  return row.every(
    (cell) =>
      cell === null ||
      cell === undefined ||
      String(cell).trim() === ""
  );
}

function scoreHeaderRow(row: unknown[]): number {
  const nonEmpty = row.filter(
    (c) => c !== null && c !== undefined && String(c).trim() !== ""
  );
  if (nonEmpty.length < 2) return 0;
  const stringLike = nonEmpty.filter((c) => typeof c === "string" || isNaN(Number(c)));
  const unique = new Set(nonEmpty.map((c) => String(c).toLowerCase().trim()));
  return stringLike.length * 2 + unique.size;
}

function detectHeaderAndData(matrix: unknown[][]): {
  headerRowIndex: number;
  dataStartRowIndex: number;
  headers: string[];
} {
  const scanLimit = Math.min(20, matrix.length);
  let bestIdx = 0;
  let bestScore = 0;

  for (let i = 0; i < scanLimit; i++) {
    const score = scoreHeaderRow(matrix[i] ?? []);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  const headerRow = matrix[bestIdx] ?? [];
  const headers = headerRow.map((c, idx) => {
    const label = String(c ?? "").trim();
    return label || `column_${idx + 1}`;
  });

  return {
    headerRowIndex: bestIdx,
    dataStartRowIndex: bestIdx + 1,
    headers,
  };
}

function matrixToObjects(
  matrix: unknown[][],
  headers: string[],
  startRow: number
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (let i = startRow; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || isEmptyRow(row)) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] ?? null;
    });
    rows.push(obj);
  }
  return rows;
}

function parseSheet(sheetName: string, worksheet: XLSX.WorkSheet): ParsedSheet {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: null,
    raw: false,
  }) as unknown[][];

  const { headerRowIndex, dataStartRowIndex, headers } =
    detectHeaderAndData(matrix);
  const rawRows = matrixToObjects(matrix, headers, dataStartRowIndex);
  const mappings = mapColumns(headers, rawRows);

  const parsedRows: ParsedRow[] = rawRows.map((raw, idx) => ({
    sourceRowIndex: dataStartRowIndex + idx,
    raw,
    normalized: {},
  }));

  return {
    name: sheetName,
    headers,
    headerRowIndex,
    dataStartRowIndex,
    rows: parsedRows,
    mappings,
  };
}

export function parseWorkbookFromArrayBuffer(
  buffer: ArrayBuffer
): ParsedWorkbook {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheets: ParsedSheet[] = [];

  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    if (!ws) continue;
    const sheet = parseSheet(name, ws);
    if (sheet.rows.length > 0) sheets.push(sheet);
  }

  const totalRows = sheets.reduce((acc, s) => acc + s.rows.length, 0);
  return { sheets, totalRows };
}

export function parseWorkbookFromBase64(base64: string): ParsedWorkbook {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return parseWorkbookFromArrayBuffer(bytes.buffer);
}
