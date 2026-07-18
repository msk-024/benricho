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

/**
 * Markdown を A4 縦の PDF に変換する。
 * ブラウザのフォント描画を経由するため日本語もそのまま出力できる。
 * (DOM を画像化する方式のため、PDF内のテキスト選択はできない)
 *
 * @precondition markdown は空白のみでない文字列
 * @postcondition 戻り値は application/pdf の Blob
 * @throws {RangeError} markdown が空の場合
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
    const renderedCanvas = await html2canvas(container, {
      scale: 2,
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
