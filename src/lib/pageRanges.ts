/**
 * "1-3,5,7-9" 形式のページ範囲指定を 1 始まりのページ番号配列へ展開する。
 *
 * @precondition maxPage は 1 以上の整数
 * @precondition input は空白のみでない文字列
 * @postcondition 戻り値の各要素は 1〜maxPage の整数(記載順を保持、重複は除去)
 * @throws {RangeError} 書式不正・範囲外・開始 > 終了 の場合
 */
export function parsePageRanges(input: string, maxPage: number): number[] {
  if (!Number.isInteger(maxPage) || maxPage < 1) {
    throw new RangeError(`maxPage は 1 以上の整数が必要です: ${maxPage}`);
  }
  const trimmed = input.trim();
  if (trimmed === "") throw new RangeError("ページ範囲が指定されていません");

  const pages: number[] = [];
  const seen = new Set<number>();
  for (const part of trimmed.split(",")) {
    appendRangePart(part.trim(), maxPage, pages, seen);
  }
  return pages;
}

function appendRangePart(
  part: string,
  maxPage: number,
  pages: number[],
  seen: Set<number>,
): void {
  const match = /^(\d+)(?:-(\d+))?$/.exec(part);
  if (match === null) {
    throw new RangeError(`ページ範囲の書式が不正です: "${part}"(例: 1-3,5)`);
  }
  const start = Number(match[1]);
  const end = match[2] === undefined ? start : Number(match[2]);
  if (start < 1 || start > maxPage || end > maxPage) {
    throw new RangeError(`ページ番号が範囲外です(1〜${maxPage}): "${part}"`);
  }
  if (start > end) {
    throw new RangeError(`開始ページが終了ページより後です: "${part}"`);
  }
  for (let page = start; page <= end; page++) {
    if (!seen.has(page)) {
      seen.add(page);
      pages.push(page);
    }
  }
}
