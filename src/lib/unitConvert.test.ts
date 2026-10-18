import { describe, expect, it } from "vitest";
import { convertSize, formatSizeValue } from "./unitConvert";

describe("convertSize", () => {
  it("pxから基準フォントサイズ16pxでrem/em/ptへ変換する", () => {
    const result = convertSize(24, "px", 16);
    expect(result.px).toBe(24);
    expect(result.rem).toBe(1.5);
    expect(result.em).toBe(1.5);
    expect(result.pt).toBeCloseTo(18); // 24px * 72/96 = 18pt
  });

  it("remからpxへ逆変換できる", () => {
    const result = convertSize(1.5, "rem", 16);
    expect(result.px).toBe(24);
  });

  it("ptからpxへ逆変換できる", () => {
    const result = convertSize(18, "pt", 16);
    expect(result.px).toBeCloseTo(24);
  });

  it("基準フォントサイズを変えると結果も変わる", () => {
    const result = convertSize(24, "px", 24);
    expect(result.rem).toBe(1);
  });

  it("事前条件違反でRangeErrorを投げる", () => {
    expect(() => convertSize(Number.NaN, "px", 16)).toThrow(RangeError);
    expect(() => convertSize(24, "px", 0)).toThrow(RangeError);
    expect(() => convertSize(24, "px", -1)).toThrow(RangeError);
  });
});

describe("formatSizeValue", () => {
  it("小数点以下4桁に丸め、末尾の0は削る", () => {
    expect(formatSizeValue(1.5)).toBe("1.5");
    expect(formatSizeValue(1)).toBe("1");
    expect(formatSizeValue(0.1 + 0.2)).toBe("0.3"); // 浮動小数点誤差の吸収
  });

  it("decimalsを指定できる", () => {
    expect(formatSizeValue(1.23456, 2)).toBe("1.23");
  });

  it("有限数でなければRangeErrorを投げる", () => {
    expect(() => formatSizeValue(Number.NaN)).toThrow(RangeError);
  });
});
