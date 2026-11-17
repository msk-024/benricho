import { Workbook } from "exceljs/dist/exceljs.bare.min.js";
import type { CellValue, Worksheet } from "exceljs";
import { rowsToMarkdownTable } from "./markdownTable";

export interface ExcelToMarkdownOptions {
  /** 各シートの先頭行をヘッダー行として扱うか */
  hasHeaderRow: boolean;
}

/**
 * Excel(.xlsx)の各シートを「## シート名」見出し+Markdownの表に変換する。
 * 空シートや表に変換できないシート(ヘッダー行のみ等)は、そのシートだけ
 * 注記を出力し全体の変換は継続する。
 *
 * @precondition bytes は正当な .xlsx(.xls形式は非対応)
 * @postcondition 戻り値はシート数分のセクションを "\n\n" で連結した文字列
 * @throws {Error} ファイルの読み込みに失敗した場合、またはシートが1つもない場合
 */
export async function excelToMarkdown(
  bytes: ArrayBuffer,
  options: ExcelToMarkdownOptions,
): Promise<string> {
  const workbook = new Workbook();
  try {
    await workbook.xlsx.load(bytes);
  } catch {
    throw new Error(
      "Excelファイルの読み込みに失敗しました(.xlsx形式のみ対応です。.xls形式や壊れたファイルは読み込めません)",
    );
  }
  if (workbook.worksheets.length === 0) {
    throw new Error("シートが見つかりませんでした");
  }
  return workbook.worksheets
    .map((sheet) => worksheetToMarkdownSection(sheet, options))
    .join("\n\n");
}

function worksheetToMarkdownSection(
  sheet: Worksheet,
  options: ExcelToMarkdownOptions,
): string {
  const heading = `## ${sheet.name}`;
  const rows = collectRows(sheet);
  if (rows.length === 0) return `${heading}\n\n(空のシートです)`;
  try {
    return `${heading}\n\n${rowsToMarkdownTable(rows, options)}`;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return `${heading}\n\n(表に変換できませんでした: ${message})`;
  }
}

/** 値を持つ行のみを対象に、行内の空セルは位置を保ったまま文字列化する */
function collectRows(sheet: Worksheet): string[][] {
  const rows: string[][] = [];
  sheet.eachRow((row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      cells.push(cellValueToText(cell.value));
    });
    rows.push(cells);
  });
  return rows;
}

function cellValueToText(value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value !== "object") return String(value);
  if ("richText" in value)
    return value.richText.map((run) => run.text).join("");
  if ("formula" in value) return cellValueToText(value.result ?? "");
  if ("sharedFormula" in value) return cellValueToText(value.result ?? "");
  if ("hyperlink" in value) return value.text;
  if ("error" in value) return value.error;
  return "";
}
