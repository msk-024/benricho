export interface AspectRatio {
  w: number;
  h: number;
}

/**
 * 横幅と比率から高さを計算する。
 *
 * @precondition width, ratio.w, ratio.h は正の有限数
 * @postcondition 戻り値は正の有限数
 * @throws {RangeError} 事前条件違反
 */
export function computeHeightFromRatio(
  width: number,
  ratio: AspectRatio,
): number {
  assertPositiveFinite(width, "width");
  assertPositiveFinite(ratio.w, "ratio.w");
  assertPositiveFinite(ratio.h, "ratio.h");
  return (width * ratio.h) / ratio.w;
}

/**
 * 横幅と高さから、最大公約数で約分した比率を求める。
 * 約分は整数同士で行うため、小数が与えられた場合は最も近い整数に丸めてから計算する。
 *
 * @precondition width, height は正の有限数
 * @postcondition 戻り値の w, h は互いに素な正の整数
 * @throws {RangeError} 事前条件違反
 */
export function simplifyRatio(width: number, height: number): AspectRatio {
  assertPositiveFinite(width, "width");
  assertPositiveFinite(height, "height");
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const divisor = greatestCommonDivisor(w, h);
  return { w: w / divisor, h: h / divisor };
}

function greatestCommonDivisor(a: number, b: number): number {
  let x = a;
  let y = b;
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x;
}

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} は正の有限数が必要です: ${value}`);
  }
}
