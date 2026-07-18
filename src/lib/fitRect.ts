export interface FitRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 元画像を、指定キャンバス内に余白(padding)を保ちながら最大サイズでフィットさせる
 * 描画矩形を計算する。LINEスタンプ書き出し等のサイズ厳密性が要求される処理の中核。
 *
 * @precondition srcWidth, srcHeight は正の有限数
 * @precondition padding は 0 以上の整数
 * @precondition canvasWidth - padding * 2 >= 1 かつ canvasHeight - padding * 2 >= 1
 * @postcondition 戻り値の矩形は padding を除いた利用可能領域に完全に収まる
 * @postcondition 幅・高さの少なくとも一方が利用可能領域いっぱいに一致する(最大化の保証)
 * @invariant アスペクト比の誤差は丸めに由来する 1px 未満に収まる
 * @throws {RangeError} 事前条件に違反した場合
 */
export function computeFitRect(
  srcWidth: number,
  srcHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  padding: number,
): FitRect {
  assertPositiveFinite(srcWidth, "srcWidth");
  assertPositiveFinite(srcHeight, "srcHeight");
  if (!Number.isInteger(padding) || padding < 0) {
    throw new RangeError(`padding は 0 以上の整数が必要です: ${padding}`);
  }
  const availWidth = canvasWidth - padding * 2;
  const availHeight = canvasHeight - padding * 2;
  if (availWidth < 1 || availHeight < 1) {
    throw new RangeError(
      `padding(${padding}px)がキャンバスサイズ(${canvasWidth}×${canvasHeight})に対して大きすぎます`,
    );
  }

  const isWidthBound = availWidth / srcWidth <= availHeight / srcHeight;
  const width = isWidthBound
    ? availWidth
    : clampDimension(
        Math.round((srcWidth * availHeight) / srcHeight),
        availWidth,
      );
  const height = isWidthBound
    ? clampDimension(
        Math.round((srcHeight * availWidth) / srcWidth),
        availHeight,
      )
    : availHeight;

  return {
    x: Math.floor((canvasWidth - width) / 2),
    y: Math.floor((canvasHeight - height) / 2),
    width,
    height,
  };
}

function clampDimension(value: number, max: number): number {
  return Math.min(Math.max(value, 1), max);
}

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} は正の有限数が必要です: ${value}`);
  }
}
