export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  /** 0〜1 */
  a: number;
}

export interface HslaColor {
  /** 0〜360 */
  h: number;
  /** 0〜100 */
  s: number;
  /** 0〜100 */
  l: number;
  /** 0〜1 */
  a: number;
}

/**
 * HEXカラー文字列(#RGB / #RGBA / #RRGGBB / #RRGGBBAA、#は省略可)をパースする。
 *
 * @postcondition 戻り値の r,g,b は 0〜255、a は 0〜1
 * @throws {RangeError} 不正な形式の場合
 */
export function parseHexColor(hex: string): RgbaColor {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]+$/.test(normalized)) {
    throw new RangeError(`不正なHEXカラーです: ${hex}`);
  }
  const expand = (pair: string): string =>
    pair
      .split("")
      .map((char) => char + char)
      .join("");

  let hex6: string;
  let alphaHex: string | null = null;
  if (normalized.length === 3) {
    hex6 = expand(normalized);
  } else if (normalized.length === 4) {
    hex6 = expand(normalized.slice(0, 3));
    alphaHex = expand(normalized.slice(3, 4));
  } else if (normalized.length === 6) {
    hex6 = normalized;
  } else if (normalized.length === 8) {
    hex6 = normalized.slice(0, 6);
    alphaHex = normalized.slice(6, 8);
  } else {
    throw new RangeError(`不正なHEXカラーです: ${hex}`);
  }
  return {
    r: parseInt(hex6.slice(0, 2), 16),
    g: parseInt(hex6.slice(2, 4), 16),
    b: parseInt(hex6.slice(4, 6), 16),
    a: alphaHex !== null ? parseInt(alphaHex, 16) / 255 : 1,
  };
}

/**
 * RGBAカラーをHEX文字列にする。
 *
 * @precondition color.r,g,b は 0〜255、color.a は 0〜1
 * @param includeAlpha true なら #RRGGBBAA 形式(alpha=1でも8桁で出力)
 * @throws {RangeError} 事前条件違反
 */
export function formatHex(color: RgbaColor, includeAlpha = false): string {
  assertValidRgba(color);
  const toHex2 = (value: number): string =>
    Math.round(value).toString(16).padStart(2, "0");
  const base = `#${toHex2(color.r)}${toHex2(color.g)}${toHex2(color.b)}`;
  if (!includeAlpha) return base;
  return `${base}${toHex2(color.a * 255)}`;
}

/**
 * RGBAカラーを、そのまま貼れるCSSの rgb() 記法にする(モダン構文、スペース区切り)。
 * 不透明(a=1)の場合はアルファ部分を省略する。
 *
 * @precondition color.r,g,b は 0〜255、color.a は 0〜1
 * @example rgb(53 82 201 / 50%)
 * @throws {RangeError} 事前条件違反
 */
export function formatRgbCss(color: RgbaColor): string {
  assertValidRgba(color);
  const r = Math.round(color.r);
  const g = Math.round(color.g);
  const b = Math.round(color.b);
  if (color.a >= 1) return `rgb(${r} ${g} ${b})`;
  return `rgb(${r} ${g} ${b} / ${Math.round(color.a * 100)}%)`;
}

/**
 * HSLAカラーを、そのまま貼れるCSSの hsl() 記法にする(モダン構文、スペース区切り)。
 * 不透明(a=1)の場合はアルファ部分を省略する。
 *
 * @precondition color.h は 0〜360、color.s,l は 0〜100、color.a は 0〜1
 * @throws {RangeError} 事前条件違反
 */
export function formatHslCss(color: HslaColor): string {
  assertValidHsla(color);
  const h = Math.round(color.h);
  const s = Math.round(color.s);
  const l = Math.round(color.l);
  if (color.a >= 1) return `hsl(${h} ${s}% ${l}%)`;
  return `hsl(${h} ${s}% ${l}% / ${Math.round(color.a * 100)}%)`;
}

/**
 * RGBAからHSLAへ変換する。
 *
 * @precondition color.r,g,b は 0〜255、color.a は 0〜1
 * @throws {RangeError} 事前条件違反
 */
export function rgbaToHsla(color: RgbaColor): HslaColor {
  assertValidRgba(color);
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100, a: color.a };
}

/**
 * HSLAからRGBAへ変換する。
 *
 * @precondition color.h は 0〜360、color.s,l は 0〜100、color.a は 0〜1
 * @throws {RangeError} 事前条件違反
 */
export function hslaToRgba(color: HslaColor): RgbaColor {
  assertValidHsla(color);
  const h = color.h / 360;
  const s = color.s / 100;
  const l = color.l / 100;
  if (s === 0) {
    const gray = Math.round(l * 255);
    return { r: gray, g: gray, b: gray, a: color.a };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const toChannel = (t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return {
    r: Math.round(toChannel(h + 1 / 3) * 255),
    g: Math.round(toChannel(h) * 255),
    b: Math.round(toChannel(h - 1 / 3) * 255),
    a: color.a,
  };
}

function assertValidRgba(color: RgbaColor): void {
  assertInRange(color.r, 0, 255, "color.r");
  assertInRange(color.g, 0, 255, "color.g");
  assertInRange(color.b, 0, 255, "color.b");
  assertInRange(color.a, 0, 1, "color.a");
}

function assertValidHsla(color: HslaColor): void {
  assertInRange(color.h, 0, 360, "color.h");
  assertInRange(color.s, 0, 100, "color.s");
  assertInRange(color.l, 0, 100, "color.l");
  assertInRange(color.a, 0, 1, "color.a");
}

function assertInRange(
  value: number,
  min: number,
  max: number,
  name: string,
): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} は ${min}〜${max} が必要です: ${value}`);
  }
}
