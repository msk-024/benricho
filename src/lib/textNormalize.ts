export type AsciiMode = "keep" | "toHalf" | "toFull";
export type KanaMode = "keep" | "toFull" | "toHalf";
export type SpaceMode = "keep" | "toHalf" | "toFull";

export interface NormalizeOptions {
  ascii: AsciiMode;
  kana: KanaMode;
  space: SpaceMode;
}

export interface TextCountResult {
  /** Unicode コードポイント数(サロゲートペアを 1 文字と数える) */
  totalChars: number;
  charsWithoutWhitespace: number;
  fullWidthChars: number;
  halfWidthChars: number;
  lineCount: number;
  utf8Bytes: number;
}

const HALF_KANA =
  "ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ｡｢｣､･";
const FULL_KANA =
  "ヲァィゥェォャュョッーアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン。「」、・";

const VOICED_PAIRS: ReadonlyArray<readonly [base: string, voiced: string]> = [
  ["カ", "ガ"],
  ["キ", "ギ"],
  ["ク", "グ"],
  ["ケ", "ゲ"],
  ["コ", "ゴ"],
  ["サ", "ザ"],
  ["シ", "ジ"],
  ["ス", "ズ"],
  ["セ", "ゼ"],
  ["ソ", "ゾ"],
  ["タ", "ダ"],
  ["チ", "ヂ"],
  ["ツ", "ヅ"],
  ["テ", "デ"],
  ["ト", "ド"],
  ["ハ", "バ"],
  ["ヒ", "ビ"],
  ["フ", "ブ"],
  ["ヘ", "ベ"],
  ["ホ", "ボ"],
  ["ウ", "ヴ"],
];
const SEMI_VOICED_PAIRS: ReadonlyArray<
  readonly [base: string, semiVoiced: string]
> = [
  ["ハ", "パ"],
  ["ヒ", "ピ"],
  ["フ", "プ"],
  ["ヘ", "ペ"],
  ["ホ", "ポ"],
];

const halfToFullKana = buildCharMap(HALF_KANA, FULL_KANA);
const fullToHalfKana = buildCharMap(FULL_KANA, HALF_KANA);
const voicedByBase = new Map(VOICED_PAIRS);
const semiVoicedByBase = new Map(SEMI_VOICED_PAIRS);
const halfSequenceByVoiced = new Map(
  VOICED_PAIRS.map(([base, voiced]) => [
    voiced,
    `${fullToHalfKana.get(base) ?? base}ﾞ`,
  ]),
);
const halfSequenceBySemiVoiced = new Map(
  SEMI_VOICED_PAIRS.map(([base, semiVoiced]) => [
    semiVoiced,
    `${fullToHalfKana.get(base) ?? base}ﾟ`,
  ]),
);

function buildCharMap(fromChars: string, toChars: string): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i < fromChars.length; i++) {
    map.set(fromChars.charAt(i), toChars.charAt(i));
  }
  return map;
}

/**
 * テキストの文字数・行数・全角半角内訳・UTF-8 バイト数を数える。
 *
 * @postcondition 各カウントは 0 以上。halfWidthChars = totalChars - fullWidthChars
 */
export function countText(text: string): TextCountResult {
  let totalChars = 0;
  let charsWithoutWhitespace = 0;
  let fullWidthChars = 0;
  for (const char of text) {
    totalChars++;
    if (!/\s/u.test(char)) charsWithoutWhitespace++;
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined && isFullWidthCodePoint(codePoint))
      fullWidthChars++;
  }
  return {
    totalChars,
    charsWithoutWhitespace,
    fullWidthChars,
    halfWidthChars: totalChars - fullWidthChars,
    lineCount: text === "" ? 0 : text.split(/\r\n|\r|\n/).length,
    utf8Bytes: new TextEncoder().encode(text).length,
  };
}

/** East Asian Width の Wide/Fullwidth に相当する主要範囲(絵文字含む)を全角とみなす */
function isFullWidthCodePoint(codePoint: number): boolean {
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe4f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
    (codePoint >= 0x1f300 && codePoint <= 0x1faff) ||
    (codePoint >= 0x20000 && codePoint <= 0x3fffd)
  );
}

/**
 * 全角半角の統一変換を行う。カナ → 英数字 → スペースの順に適用する。
 *
 * @precondition options の各モードは型で定義された値のみ
 * @postcondition 'keep' 指定の系統は元の文字を変更しない
 */
export function normalizeText(text: string, options: NormalizeOptions): string {
  let result = text;
  if (options.kana === "toFull") result = kanaToFullWidth(result);
  if (options.kana === "toHalf") result = kanaToHalfWidth(result);
  if (options.ascii === "toHalf") result = asciiToHalfWidth(result);
  if (options.ascii === "toFull") result = asciiToFullWidth(result);
  if (options.space === "toHalf") result = result.replaceAll("　", " ");
  if (options.space === "toFull") result = result.replaceAll(" ", "　");
  return result;
}

/** 全角英数字・記号(！-～)を半角に変換する */
export function asciiToHalfWidth(text: string): string {
  return text.replaceAll(/[！-～]/gu, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );
}

/** 半角英数字・記号(!-~)を全角に変換する(スペースは対象外) */
export function asciiToFullWidth(text: string): string {
  return text.replaceAll(/[!-~]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0xfee0),
  );
}

/** 半角カタカナを全角に変換する。濁点・半濁点は直前の文字と合成する */
export function kanaToFullWidth(text: string): string {
  // NFD正規化された結合文字(濁点 U+3099 等)を合成済み文字に統一してから処理する
  const normalized = text.normalize("NFC");
  let result = "";
  let index = 0;
  while (index < normalized.length) {
    const char = normalized.charAt(index);
    const base = halfToFullKana.get(char);
    if (base === undefined) {
      result += char === "ﾞ" ? "゛" : char === "ﾟ" ? "゜" : char;
      index++;
      continue;
    }
    const nextChar = normalized.charAt(index + 1);
    const voiced = nextChar === "ﾞ" ? voicedByBase.get(base) : undefined;
    const semiVoiced =
      nextChar === "ﾟ" ? semiVoicedByBase.get(base) : undefined;
    result += voiced ?? semiVoiced ?? base;
    index += voiced !== undefined || semiVoiced !== undefined ? 2 : 1;
  }
  return result;
}

/** 全角カタカナを半角に変換する。濁音・半濁音は 2 文字(ｶﾞ 等)に分解する */
export function kanaToHalfWidth(text: string): string {
  // NFD正規化された結合文字(濁点 U+3099 等)を合成済み文字に統一してから処理する
  const normalized = text.normalize("NFC");
  let result = "";
  for (const char of normalized) {
    result +=
      halfSequenceByVoiced.get(char) ??
      halfSequenceBySemiVoiced.get(char) ??
      fullToHalfKana.get(char) ??
      (char === "゛" ? "ﾞ" : char === "゜" ? "ﾟ" : char);
  }
  return result;
}
