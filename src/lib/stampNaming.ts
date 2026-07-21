export type StampImageKind = "sticker" | "main" | "tab";

/**
 * LINEスタンプ書き出し用の規則的なファイル名(01_main.png 等)を生成する。
 *
 * @precondition index は 1〜99 の整数(LINEスタンプは最大 40 個)
 * @postcondition 戻り値は "NN_kind.png" 形式(NN はゼロ埋め 2 桁)
 * @throws {RangeError} index が範囲外の場合
 */
export function buildStampFileName(
  index: number,
  kind: StampImageKind,
): string {
  if (!Number.isInteger(index) || index < 1 || index > 99) {
    throw new RangeError(`index は 1〜99 の整数が必要です: ${index}`);
  }
  return `${String(index).padStart(2, "0")}_${kind}.png`;
}
