import { describe, expect, it } from "vitest";
import { computeSizeRatio } from "./stampSizeRatio";

describe("computeSizeRatio", () => {
  it("横長の絵は横幅いっぱい・縦が小さい比率になる(横長キャラが小さく見える問題の検出)", () => {
    const result = computeSizeRatio({ width: 350, height: 100 }, 370, 320);
    expect(result.widthRatio).toBeCloseTo(350 / 370);
    expect(result.heightRatio).toBeCloseTo(100 / 320);
    expect(result.shortSide).toBe("height");
    expect(result.shortSideRatio).toBeCloseTo(100 / 320);
    expect(result.isUndersized).toBe(true);
  });

  it("縦横ともthreshold以上なら isUndersized は false", () => {
    const result = computeSizeRatio({ width: 300, height: 300 }, 370, 320);
    expect(result.isUndersized).toBe(false);
  });

  it("thresholdちょうどは未満ではないのでfalse", () => {
    const result = computeSizeRatio({ width: 222, height: 300 }, 370, 320, 0.6);
    // 222/370 = 0.6 ちょうど
    expect(result.widthRatio).toBeCloseTo(0.6);
    expect(result.isUndersized).toBe(false);
  });

  it("thresholdを指定して判定を変えられる", () => {
    const result = computeSizeRatio({ width: 300, height: 300 }, 370, 320, 0.9);
    expect(result.isUndersized).toBe(true);
  });

  it("事前条件違反でRangeErrorを投げる", () => {
    expect(() => computeSizeRatio({ width: 0, height: 100 }, 370, 320)).toThrow(
      RangeError,
    );
    expect(() => computeSizeRatio({ width: 100, height: 100 }, 0, 320)).toThrow(
      RangeError,
    );
    expect(() =>
      computeSizeRatio({ width: 100, height: 100 }, 370, 320, 1.5),
    ).toThrow(RangeError);
    expect(() =>
      computeSizeRatio({ width: 100, height: 100 }, 370, 320, -0.1),
    ).toThrow(RangeError);
  });
});
