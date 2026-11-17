import { extractPdfPageTexts } from "./canvas/pdfTextExtract";

export interface PdfTextItem {
  str: string;
  hasEOL: boolean;
}

export interface PdfToMarkdownOptions {
  /** 各ページの先頭に `## ページ N` 見出しを挿入するか */
  insertPageHeadings: boolean;
}

/**
 * PDF の1ページ分のテキスト項目配列をプレーンテキストに変換する。
 * PDFには見出し等の構造情報がないため、改行位置(hasEOL)のみを頼りに行を復元する
 * (この変換は見出し構造を持たないプレーンテキストが限界で、構造の保持は保証しない)。
 *
 * @postcondition 戻り値の各行は末尾の空白を除去済み
 */
export function pageItemsToText(items: readonly PdfTextItem[]): string {
  let text = "";
  for (const item of items) {
    text += item.str;
    text += item.hasEOL ? "\n" : " ";
  }
  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

/**
 * ページごとのプレーンテキストを1つのMarkdown文字列にまとめる。
 *
 * @precondition pages は1件以上
 * @postcondition 戻り値に3行以上連続する空行は含まれない
 * @throws {RangeError} pages が空の場合
 */
export function pagesToMarkdown(
  pages: readonly string[],
  options: PdfToMarkdownOptions,
): string {
  if (pages.length === 0) throw new RangeError("PDFにページがありません");
  const sections = options.insertPageHeadings
    ? pages.map((pageText, index) => `## ページ ${index + 1}\n\n${pageText}`)
    : pages;
  return sections
    .join("\n\n")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * PDF をMarkdown(実質プレーンテキスト+ページ区切り見出し)に変換する。
 *
 * @precondition bytes は正当なPDF
 * @throws {Error} 暗号化PDF・壊れたPDF・ページがないPDFの場合
 */
export async function pdfToMarkdown(
  bytes: Uint8Array,
  options: PdfToMarkdownOptions,
): Promise<string> {
  const pages = await extractPdfPageTexts(bytes);
  return pagesToMarkdown(pages.map(pageItemsToText), options);
}
