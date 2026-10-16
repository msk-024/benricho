export type StampImageKind = "sticker" | "main" | "tab";

/**
 * LINEスタンプ書き出し用の規則的なファイル名を生成する。
 * ZIP一括アップロード時にこの命名でないと読み込みエラーになるという情報が複数の
 * 解説記事にあり、絵文字作成時の命名違いによる読み込み失敗の実体験とも合致するため、
 * LINE公式の命名(main.png / tab.png / 01.png〜)に合わせる。
 *
 * @precondition index は 1〜99 の整数(LINEスタンプは最大 40 個)
 * @postcondition kind="main"/"tab" は "main.png"/"tab.png"、kind="sticker" は
 *   "NN.png" 形式(NN はゼロ埋め 2 桁)
 * @throws {RangeError} index が範囲外の場合
 */
export function buildStampFileName(
  index: number,
  kind: StampImageKind,
): string {
  if (!Number.isInteger(index) || index < 1 || index > 99) {
    throw new RangeError(`index は 1〜99 の整数が必要です: ${index}`);
  }
  if (kind === "main") return "main.png";
  if (kind === "tab") return "tab.png";
  return `${String(index).padStart(2, "0")}.png`;
}

/** fileName が buildStampFileName の生成した main/tab ファイルかどうかを判定する */
export function isMainOrTabFile(fileName: string): boolean {
  return fileName === "main.png" || fileName === "tab.png";
}
