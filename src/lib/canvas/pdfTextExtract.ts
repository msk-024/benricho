import type { PdfTextItem } from "../pdfToMarkdown";
import { getDocument } from "./pdfjsSetup";

/**
 * PDF の各ページからテキスト項目を抽出する(pdf.jsのWorkerを使用、ブラウザ専用)。
 *
 * @precondition bytes は正当なPDF
 * @postcondition 戻り値の件数は総ページ数に一致する
 * @throws {Error} 暗号化PDF・壊れたPDFの場合
 */
export async function extractPdfPageTexts(
  bytes: Uint8Array,
): Promise<PdfTextItem[][]> {
  const loadingTask = getDocument({ data: bytes });
  try {
    const pdf = await loadingTask.promise;
    const pages: PdfTextItem[][] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const items: PdfTextItem[] = [];
      for (const item of content.items) {
        if ("str" in item) items.push({ str: item.str, hasEOL: item.hasEOL });
      }
      pages.push(items);
    }
    return pages;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PasswordException") {
      throw new Error("暗号化(パスワード保護)されたPDFは処理できません");
    }
    throw error;
  } finally {
    await loadingTask.destroy();
  }
}
