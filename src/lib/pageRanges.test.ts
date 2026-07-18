import { describe, expect, it } from "vitest";
import { parsePageRanges } from "./pageRanges";

describe("parsePageRanges", () => {
  it("単一ページ・範囲・混在を展開する", () => {
    expect(parsePageRanges("3", 10)).toEqual([3]);
    expect(parsePageRanges("1-4", 10)).toEqual([1, 2, 3, 4]);
    expect(parsePageRanges("1-3, 5, 8-9", 10)).toEqual([1, 2, 3, 5, 8, 9]);
  });

  it("記載順を保持し、重複は除去する", () => {
    expect(parsePageRanges("5,1-3,2", 10)).toEqual([5, 1, 2, 3]);
  });

  it("書式不正・範囲外・逆順で RangeError を投げる", () => {
    expect(() => parsePageRanges("", 10)).toThrow(RangeError);
    expect(() => parsePageRanges("abc", 10)).toThrow("書式が不正");
    expect(() => parsePageRanges("0", 10)).toThrow("範囲外");
    expect(() => parsePageRanges("11", 10)).toThrow("範囲外");
    expect(() => parsePageRanges("1-11", 10)).toThrow("範囲外");
    expect(() => parsePageRanges("5-3", 10)).toThrow(
      "開始ページが終了ページより後",
    );
    expect(() => parsePageRanges("1,,3", 10)).toThrow(RangeError);
    expect(() => parsePageRanges("1", 0)).toThrow(RangeError);
  });
});
