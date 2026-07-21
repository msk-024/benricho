import { jsPDF } from "jspdf";
import { createCanvas } from "./canvasUtils";
import { getDocument } from "./pdfjsSetup";

export interface PdfCompressOptions {
  /** 再描画の解像度倍率(高いほど高画質・大容量) */
  renderScale: number;
  /** JPEG品質 0〜1 */
  jpegQuality: number;
}

/**
 * PDF を各ページ画像への再ラスタライズで圧縮する。
 * テキストの選択・検索はできなくなる代わりに、大幅なサイズ削減が可能。
 *
 * @precondition bytes は正当な PDF、renderScale は 0.5〜3、jpegQuality は 0.1〜1
 * @postcondition 戻り値は元と同じページ数・同じページ寸法の PDF
 * @throws {Error} PDF が読めない、またはページがない場合
 */
export async function compressPdfByRasterize(
  bytes: Uint8Array,
  options: PdfCompressOptions,
): Promise<Blob> {
  const { renderScale, jpegQuality } = options;
  if (
    renderScale < 0.5 ||
    renderScale > 3 ||
    jpegQuality < 0.1 ||
    jpegQuality > 1
  ) {
    throw new RangeError("圧縮オプションが範囲外です");
  }
  const loadingTask = getDocument({ data: new Uint8Array(bytes) });
  try {
    const pdf = await loadingTask.promise;
    if (pdf.numPages === 0) throw new Error("PDFにページがありません");
    let outputDocument: jsPDF | null = null;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const renderViewport = page.getViewport({ scale: renderScale });
      const { canvas, context } = createCanvas(
        Math.max(1, Math.ceil(renderViewport.width)),
        Math.max(1, Math.ceil(renderViewport.height)),
      );
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, viewport: renderViewport }).promise;
      const orientation = baseViewport.width >= baseViewport.height ? "l" : "p";
      const pageFormat: [number, number] = [
        baseViewport.width,
        baseViewport.height,
      ];
      if (outputDocument === null) {
        outputDocument = new jsPDF({
          unit: "pt",
          format: pageFormat,
          orientation,
        });
      } else {
        outputDocument.addPage(pageFormat, orientation);
      }
      outputDocument.addImage(
        canvas.toDataURL("image/jpeg", jpegQuality),
        "JPEG",
        0,
        0,
        baseViewport.width,
        baseViewport.height,
      );
    }
    if (outputDocument === null) throw new Error("PDFにページがありません");
    return outputDocument.output("blob");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PasswordException") {
      throw new Error("暗号化(パスワード保護)されたPDFは処理できません");
    }
    throw error;
  } finally {
    await loadingTask.destroy();
  }
}
