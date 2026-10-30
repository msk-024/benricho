/**
 * ドット絵プレビュー・書き出し用のCanvas副作用層。純粋ロジック(../pixelArt)とは分離する。
 */

import type { RgbaImage } from "../imageOps";
import { createCanvas, imageDataToCanvas } from "./canvasUtils";

/**
 * ドット絵画像をニアレストネイバー法で整数倍に拡大したCanvasを作る。
 * 補間をかけると境界がにじんでドット感が失われるため imageSmoothingEnabled を無効化する。
 *
 * @precondition scale は1以上の整数
 * @throws {RangeError} 事前条件に違反した場合
 */
export function upscalePixelArtCanvas(
  image: RgbaImage,
  scale: number,
): HTMLCanvasElement {
  if (!Number.isInteger(scale) || scale < 1) {
    throw new RangeError(`scale は1以上の整数が必要です: ${scale}`);
  }
  const source = imageDataToCanvas(
    new ImageData(new Uint8ClampedArray(image.data), image.width, image.height),
  );
  const { canvas, context } = createCanvas(
    image.width * scale,
    image.height * scale,
  );
  context.imageSmoothingEnabled = false;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** SVGなどベクター画像を取り込む際、十分な解像度でラスタライズするための長辺目標サイズ(px) */
const VECTOR_RASTER_TARGET_PX = 1024;

/**
 * SVGなどベクター画像(HTMLImageElement)を、小さいviewBoxのままでも細部が潰れないよう
 * 長辺が VECTOR_RASTER_TARGET_PX になる解像度で再ラスタライズする。
 * ラスター画像(PNG/JPG等)はこの関数を使わず drawImageToCanvas で等倍のまま扱う。
 *
 * @precondition image は decode 済みで naturalWidth/naturalHeight が1以上
 * @throws {RangeError} 事前条件に違反した場合
 */
export function rasterizeVectorImage(
  image: HTMLImageElement,
): HTMLCanvasElement {
  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;
  if (naturalWidth < 1 || naturalHeight < 1) {
    throw new RangeError(
      `ベクター画像のサイズを取得できませんでした(width/heightまたはviewBoxの指定を確認してください): ${naturalWidth}×${naturalHeight}`,
    );
  }
  const scale = VECTOR_RASTER_TARGET_PX / Math.max(naturalWidth, naturalHeight);
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const { canvas, context } = createCanvas(width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

/**
 * 拡大済みCanvasの上にマス目の境界線を描き足したコピーを返す(プレビュー専用)。
 * 書き出しファイルにはこの線を含めない(元のCanvasは変更しない)。
 */
export function withGridOverlay(
  upscaledCanvas: HTMLCanvasElement,
  cellSizePx: number,
  lineColor = "rgba(0,0,0,0.2)",
): HTMLCanvasElement {
  const { canvas, context } = createCanvas(
    upscaledCanvas.width,
    upscaledCanvas.height,
  );
  context.drawImage(upscaledCanvas, 0, 0);
  context.strokeStyle = lineColor;
  context.lineWidth = 1;
  for (let x = cellSizePx; x < canvas.width; x += cellSizePx) {
    context.beginPath();
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, canvas.height);
    context.stroke();
  }
  for (let y = cellSizePx; y < canvas.height; y += cellSizePx) {
    context.beginPath();
    context.moveTo(0, y + 0.5);
    context.lineTo(canvas.width, y + 0.5);
    context.stroke();
  }
  return canvas;
}
