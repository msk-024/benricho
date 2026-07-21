import DOMPurify from "dompurify";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { MARKDOWN_DOCUMENT_CSS, markdownToHtmlFragment } from "../markdownHtml";
import { createCanvas } from "./canvasUtils";

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const PAGE_MARGIN_PT = 40;
/** A4幅相当の描画幅(96dpi) */
const RENDER_WIDTH_PX = 794;
const RENDER_SCALE = 2;
/**
 * ブラウザのCanvas実装が確実に描画できると見込める上限。
 * これを超えると html2canvas が例外を投げずに欠落・空白の canvas を
 * 黙って返すことがあるため、描画前に検知して分かりやすいエラーにする
 */
const MAX_CANVAS_DIMENSION_PX = 16_384;
const MAX_CANVAS_AREA_PX = MAX_CANVAS_DIMENSION_PX * MAX_CANVAS_DIMENSION_PX;

/**
 * Markdown を A4 縦の PDF に変換する。
 * ブラウザのフォント描画を経由するため日本語もそのまま出力できる。
 * (DOM を画像化する方式のため、PDF内のテキスト選択はできない)
 *
 * @precondition markdown は空白のみでない文字列
 * @postcondition 戻り値は application/pdf の Blob
 * @throws {RangeError} markdown が空、または内容が長すぎて安全に描画できない場合
 */
export async function markdownToPdfBlob(markdown: string): Promise<Blob> {
  if (markdown.trim() === "") throw new RangeError("Markdownが空です");
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = `${RENDER_WIDTH_PX}px`;
  container.style.backgroundColor = "#ffffff";
  // 生HTMLをDOMへ入れる前に無害化する(XSS対策)
  const sanitizedHtml = DOMPurify.sanitize(markdownToHtmlFragment(markdown));
  container.innerHTML = `<style>${MARKDOWN_DOCUMENT_CSS}</style><div class="markdown-body">${sanitizedHtml}</div>`;
  document.body.appendChild(container);
  try {
    // html2canvasは描画結果がCanvas上限を超えても例外を投げないため、
    // 実際に描画する前にDOMの実測サイズから予測して検証する
    const predictedWidth = RENDER_WIDTH_PX * RENDER_SCALE;
    const predictedHeight = container.scrollHeight * RENDER_SCALE;
    if (
      predictedWidth > MAX_CANVAS_DIMENSION_PX ||
      predictedHeight > MAX_CANVAS_DIMENSION_PX ||
      predictedWidth * predictedHeight > MAX_CANVAS_AREA_PX
    ) {
      throw new RangeError(
        "Markdownの内容が長すぎてPDFに変換できません(ブラウザの描画上限を超えるおそれがあります)。内容を分割してください",
      );
    }
    const renderedCanvas = await html2canvas(container, {
      scale: RENDER_SCALE,
      backgroundColor: "#ffffff",
      logging: false,
    });
    return buildPdfFromTallCanvas(renderedCanvas);
  } finally {
    container.remove();
  }
}

/** 縦長キャンバスをA4ページごとに切り出してPDFにする */
function buildPdfFromTallCanvas(sourceCanvas: HTMLCanvasElement): Blob {
  const contentWidthPt = A4_WIDTH_PT - PAGE_MARGIN_PT * 2;
  const contentHeightPt = A4_HEIGHT_PT - PAGE_MARGIN_PT * 2;
  const pxPerPt = sourceCanvas.width / contentWidthPt;
  const pageHeightPx = Math.floor(contentHeightPt * pxPerPt);
  if (sourceCanvas.width < 1 || sourceCanvas.height < 1 || pageHeightPx < 1) {
    throw new Error("PDFの描画に失敗しました");
  }
  const outputDocument = new jsPDF({ unit: "pt", format: "a4" });
  for (
    let offsetY = 0, pageIndex = 0;
    offsetY < sourceCanvas.height;
    offsetY += pageHeightPx, pageIndex++
  ) {
    if (pageIndex > 0) outputDocument.addPage();
    const sliceHeightPx = Math.min(pageHeightPx, sourceCanvas.height - offsetY);
    const { canvas, context } = createCanvas(sourceCanvas.width, sliceHeightPx);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      sourceCanvas,
      0,
      offsetY,
      sourceCanvas.width,
      sliceHeightPx,
      0,
      0,
      sourceCanvas.width,
      sliceHeightPx,
    );
    outputDocument.addImage(
      canvas.toDataURL("image/jpeg", 0.92),
      "JPEG",
      PAGE_MARGIN_PT,
      PAGE_MARGIN_PT,
      contentWidthPt,
      sliceHeightPx / pxPerPt,
    );
  }
  return outputDocument.output("blob");
}
