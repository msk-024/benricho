import Papa from "papaparse";

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
  const rows = parsed.data;
  if (rows.length === 0) throw new Error("CSVにデータ行がありません");
  if (options.hasHeaderRow && rows.length === 1) {
    throw new Error("ヘッダー行のみでデータ行がありません");
  }

  const columnCount = Math.max(...rows.map((row) => row.length));
  const headerCells = options.hasHeaderRow
    ? (rows.at(0) ?? [])
    : buildDefaultHeader(columnCount);
  const bodyRows = options.hasHeaderRow ? rows.slice(1) : rows;
  const separatorCells = Array.from({ length: columnCount }, () => "---");

  return [
    toMarkdownRow(headerCells, columnCount),
    `| ${separatorCells.join(" | ")} |`,
    ...bodyRows.map((row) => toMarkdownRow(row, columnCount)),
  ].join("\n");
}

function buildDefaultHeader(columnCount: number): string[] {
  return Array.from({ length: columnCount }, (_, index) => `列${index + 1}`);
}

/** 列数に満たない行は空セルで埋めて Markdown の行として整形する */
function toMarkdownRow(cells: readonly string[], columnCount: number): string {
  const padded = Array.from({ length: columnCount }, (_, index) =>
    escapeMarkdownCell(cells[index] ?? ""),
  );
  return `| ${padded.join(" | ")} |`;
}

/** パイプ・バックスラッシュ・改行を Markdown 表セル内で安全な表現に変換する */
function escapeMarkdownCell(cell: string): string {
  return cell
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replaceAll("\r\n", "<br>")
    .replaceAll("\n", "<br>")
    .replaceAll("\r", "<br>");
}
