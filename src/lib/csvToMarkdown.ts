import Papa from "papaparse";
import { rowsToMarkdownTable } from "./markdownTable";

export interface CsvToMarkdownOptions {
  /** 1 行目をヘッダー行として扱うか。false の場合は「列1, 列2, …」を自動生成する */
  hasHeaderRow: boolean;
}

/**
 * CSV テキストを GitHub Flavored Markdown の表に変換する。
 * 引用符・セル内改行・セル内カンマは papaparse により正しく解釈される。
 *
 * @precondition csvText は空白のみでない文字列
 * @postcondition 戻り値はヘッダー行 + 区切り行 + データ行からなる Markdown 表
 * @throws {Error} CSV の解析に失敗した場合、またはデータ行が 1 行もない場合
 */
export function csvToMarkdownTable(
  csvText: string,
  options: CsvToMarkdownOptions,
): string {
  const parsed = Papa.parse<string[]>(csvText.trim(), {
    skipEmptyLines: "greedy",
  });
  const fatalError = parsed.errors.at(0);
  if (fatalError !== undefined) {
    throw new Error(`CSVの解析に失敗しました: ${fatalError.message}`);
  }
  return rowsToMarkdownTable(parsed.data, options);
}
