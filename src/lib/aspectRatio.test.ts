import { describe, expect, it } from "vitest";
import { computeHeightFromRatio, simplifyRatio } from "./aspectRatio";

describe("computeHeightFromRatio", () => {
  it("16:9の横幅1920から高さ1080を計算する", () => {
    expect(computeHeightFromRatio(1920, { w: 16, h: 9 })).toBe(1080);
  });

  it("割り切れない場合は小数のまま返す", () => {
    expect(computeHeightFromRatio(1000, { w: 4, h: 3 })).toBeCloseTo(750);
    expect(computeHeightFromRatio(1000, { w: 3, h: 1 })).toBeCloseTo(
      333.333,
      2,
    );
  });

  it("事前条件違反でRangeErrorを投げる", () => {
    expect(() => computeHeightFromRatio(0, { w: 16, h: 9 })).toThrow(
      RangeError,
    );
    expect(() => computeHeightFromRatio(1920, { w: 0, h: 9 })).toThrow(
      RangeError,
    );
    expect(() => computeHeightFromRatio(-1, { w: 16, h: 9 })).toThrow(
      RangeError,
    );
  });
});

describe("simplifyRatio", () => {
  it("1920×1080を16:9に約分する", () => {
    expect(simplifyRatio(1920, 1080)).toEqual({ w: 16, h: 9 });
  });

  it("1080×1350を4:5に約分する", () => {
    expect(simplifyRatio(1080, 1350)).toEqual({ w: 4, h: 5 });
  });

  it("1080×1080を1:1に約分する", () => {
    expect(simplifyRatio(1080, 1080)).toEqual({ w: 1, h: 1 });
  });

  it("互いに素な値はそのまま返す", () => {
    expect(simplifyRatio(7, 13)).toEqual({ w: 7, h: 13 });
  });

  it("小数は最も近い整数に丸めてから約分する", () => {
    expect(simplifyRatio(1920.4, 1080.4)).toEqual({ w: 16, h: 9 });
  });

  it("事前条件違反でRangeErrorを投げる", () => {
    expect(() => simplifyRatio(0, 1080)).toThrow(RangeError);
    expect(() => simplifyRatio(1920, -1)).toThrow(RangeError);
  });
});
