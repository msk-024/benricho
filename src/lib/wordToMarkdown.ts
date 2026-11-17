import mammoth from "mammoth/mammoth.browser";
import TurndownService from "turndown";
import { escapeMarkdownCell } from "./markdownTable";

/**
 * Word(.docx)をMarkdownに変換する(見出し・リスト・強調・表を保持)。
 * mammothでdocx→HTMLに変換し、turndownでHTML→Markdownへ変換する2段構成。
 * turndownは表(table)を標準対応していないため、表だけ専用ルールで処理する。
 *
 * @precondition bytes は正当な .docx
 * @postcondition 戻り値は変換後のMarkdown文字列(前後の空白は除去済み)
 * @throws {Error} .docx の読み込みに失敗した場合
 */
export async function wordToMarkdown(bytes: ArrayBuffer): Promise<string> {
  let html: string;
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer: bytes });
    html = result.value;
  } catch {
    throw new Error(
      "Wordファイルの読み込みに失敗しました(.docx形式のみ対応です。.doc形式や壊れたファイルは読み込めません)",
    );
  }
  return buildTurndownService().turndown(html).trim();
}

function buildTurndownService(): TurndownService {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
  });
  turndownService.addRule("table", {
    filter: "table",
    replacement: (_content, node) => tableNodeToMarkdown(node, turndownService),
  });
  return turndownService;
}

/** table要素を行×列のテキストに読み出し、共通の表組み立て処理でMarkdown表にする */
function tableNodeToMarkdown(
  node: HTMLElement,
  turndownService: TurndownService,
): string {
  const rows = Array.from(node.querySelectorAll("tr")).map((tr) =>
    Array.from(tr.children).map((cell) =>
      cellToMarkdownText(cell, turndownService),
    ),
  );
  if (rows.length === 0) return "";
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const padded = rows.map((row) =>
    Array.from({ length: columnCount }, (_, index) => row[index] ?? ""),
  );
  const toRow = (row: readonly string[]): string =>
    `| ${row.map(escapeMarkdownCell).join(" | ")} |`;
  const separator = `| ${Array.from({ length: columnCount }, () => "---").join(" | ")} |`;
  return `\n\n${[toRow(padded[0] ?? []), separator, ...padded.slice(1).map(toRow)].join("\n")}\n\n`;
}

/** セル内の強調等のインライン書式を保ったまま1行のテキストに畳み込む */
function cellToMarkdownText(
  cell: Element,
  turndownService: TurndownService,
): string {
  return turndownService
    .turndown(cell.innerHTML)
    .trim()
    .replaceAll(/\n+/g, " ");
}
