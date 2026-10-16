export interface SizeRatioResult {
  widthRatio: number;
  heightRatio: number;
  /** 横・縦の占有率のうち小さい方 */
  shortSideRatio: number;
  /** 短い方の辺 */
  shortSide: "width" | "height";
  /** shortSideRatio が threshold 未満(=トーク画面で小さく見えやすい) */
  isUndersized: boolean;
}

const DEFAULT_THRESHOLD = 0.6;

/**
 * 書き出しキャンバス内で絵が占める横・縦の割合を算出する。
 * `computeFitRect` が返す配置矩形(=最大フィット後の絵の表示サイズ)をそのまま使うため、
 * ピクセル再スキャンは不要。
 *
 * @precondition fitRect.width/height は正の有限数、canvasWidth/canvasHeight は正の有限数
 * @precondition threshold は 0〜1
 * @throws {RangeError} 事前条件違反
 */
export function computeSizeRatio(
  fitRect: { width: number; height: number },
  canvasWidth: number,
  canvasHeight: number,
  threshold: number = DEFAULT_THRESHOLD,
): SizeRatioResult {
  assertPositiveFinite(fitRect.width, "fitRect.width");
  assertPositiveFinite(fitRect.height, "fitRect.height");
  assertPositiveFinite(canvasWidth, "canvasWidth");
  assertPositiveFinite(canvasHeight, "canvasHeight");
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new RangeError(`threshold は 0〜1 が必要です: ${threshold}`);
  }

  const widthRatio = fitRect.width / canvasWidth;
  const heightRatio = fitRect.height / canvasHeight;
  const shortSide: "width" | "height" =
    widthRatio <= heightRatio ? "width" : "height";
  const shortSideRatio = Math.min(widthRatio, heightRatio);

  return {
    widthRatio,
    heightRatio,
    shortSideRatio,
    shortSide,
    isUndersized: shortSideRatio < threshold,
  };
}

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} は正の有限数が必要です: ${value}`);
  }
}
