export interface RowsToMarkdownTableOptions {
  /** 先頭行をヘッダー行として扱うか。false の場合は「列1, 列2, …」を自動生成する */
  hasHeaderRow: boolean;
}

/**
 * 行×列の文字列データを GitHub Flavored Markdown の表に変換する。
 * CSV / Excel など複数の変換元から共通利用する。
 *
 * @precondition rows は 1 行以上
 * @postcondition 戻り値はヘッダー行 + 区切り行 + データ行からなる Markdown 表
 * @throws {Error} データ行が 1 行もない場合
 */
export function rowsToMarkdownTable(
  rows: readonly (readonly string[])[],
  options: RowsToMarkdownTableOptions,
): string {
  if (rows.length === 0) throw new Error("表に変換するデータ行がありません");
  if (options.hasHeaderRow && rows.length === 1) {
    throw new Error("ヘッダー行のみでデータ行がありません");
  }

  // Math.max(...rows.map(...)) は行数が多いとスプレッド引数の上限で
  // スタックオーバーフローしうるため、reduce で最大値を求める
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
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
export function escapeMarkdownCell(cell: string): string {
  return cell
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replaceAll("\r\n", "<br>")
    .replaceAll("\n", "<br>")
    .replaceAll("\r", "<br>");
}
