export type SizeUnit = "px" | "rem" | "em" | "pt";

export interface SizeConversionResult {
  px: number;
  rem: number;
  em: number;
  pt: number;
}

/** 1pt を px に換算する係数(96dpi基準: 1in = 96px = 72pt) */
const PX_PER_PT = 96 / 72;

/**
 * 指定した単位の値を、px/rem/em/pt すべてに変換する。
 * rem・em はどちらも基準フォントサイズに対する比率(この電卓では親要素と
 * ルート要素を区別しないため同じ計算式になる)。
 *
 * @precondition value は有限数、baseFontSizePx は正の有限数
 * @postcondition 戻り値の px は value と fromUnit から導いた px 換算値
 * @throws {RangeError} 事前条件違反
 */
export function convertSize(
  value: number,
  fromUnit: SizeUnit,
  baseFontSizePx: number,
): SizeConversionResult {
  if (!Number.isFinite(value)) {
    throw new RangeError(`value は有限数が必要です: ${value}`);
  }
  if (!Number.isFinite(baseFontSizePx) || baseFontSizePx <= 0) {
    throw new RangeError(
      `baseFontSizePx は正の有限数が必要です: ${baseFontSizePx}`,
    );
  }
  const px = toPx(value, fromUnit, baseFontSizePx);
  return {
    px,
    rem: px / baseFontSizePx,
    em: px / baseFontSizePx,
    pt: px / PX_PER_PT,
  };
}

function toPx(value: number, unit: SizeUnit, baseFontSizePx: number): number {
  switch (unit) {
    case "px":
      return value;
    case "rem":
    case "em":
      return value * baseFontSizePx;
    case "pt":
      return value * PX_PER_PT;
  }
}

/**
 * 表示用に数値を丸める(浮動小数点の誤差を吸収しつつ、末尾の0は削る)。
 *
 * @precondition value は有限数、decimals は 0 以上の整数
 */
export function formatSizeValue(value: number, decimals = 4): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(`value は有限数が必要です: ${value}`);
  }
  const rounded = Number(value.toFixed(decimals));
  return String(rounded);
}
