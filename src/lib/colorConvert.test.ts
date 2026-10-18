import { describe, expect, it } from "vitest";
import {
  formatHex,
  formatHslCss,
  formatRgbCss,
  hslaToRgba,
  parseHexColor,
  rgbaToHsla,
} from "./colorConvert";

describe("parseHexColor", () => {
  it("3桁HEXを展開してパースする", () => {
    expect(parseHexColor("#f0a")).toEqual({ r: 255, g: 0, b: 170, a: 1 });
  });

  it("6桁HEXをパースする", () => {
    expect(parseHexColor("#3552c9")).toEqual({ r: 53, g: 82, b: 201, a: 1 });
  });

  it("8桁HEX(アルファつき)をパースする", () => {
    const result = parseHexColor("#3552c980");
    expect(result.r).toBe(53);
    expect(result.g).toBe(82);
    expect(result.b).toBe(201);
    expect(result.a).toBeCloseTo(128 / 255);
  });

  it("先頭の#は省略可", () => {
    expect(parseHexColor("fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it("不正な形式でRangeErrorを投げる", () => {
    expect(() => parseHexColor("#zzz")).toThrow(RangeError);
    expect(() => parseHexColor("#12345")).toThrow(RangeError);
    expect(() => parseHexColor("")).toThrow(RangeError);
  });
});

describe("formatHex", () => {
  it("RGBAをHEXにする(アルファなし)", () => {
    expect(formatHex({ r: 53, g: 82, b: 201, a: 1 })).toBe("#3552c9");
  });

  it("includeAlpha指定で8桁になる", () => {
    expect(formatHex({ r: 53, g: 82, b: 201, a: 0.5 }, true)).toBe("#3552c980");
  });

  it("事前条件違反でRangeErrorを投げる", () => {
    expect(() => formatHex({ r: 300, g: 0, b: 0, a: 1 })).toThrow(RangeError);
  });
});

describe("formatRgbCss / formatHslCss", () => {
  it("不透明ならアルファ部分を省略する", () => {
    expect(formatRgbCss({ r: 53, g: 82, b: 201, a: 1 })).toBe("rgb(53 82 201)");
    expect(formatHslCss({ h: 230, s: 58, l: 50, a: 1 })).toBe(
      "hsl(230 58% 50%)",
    );
  });

  it("半透明ならスラッシュ記法でアルファを付ける", () => {
    expect(formatRgbCss({ r: 53, g: 82, b: 201, a: 0.5 })).toBe(
      "rgb(53 82 201 / 50%)",
    );
    expect(formatHslCss({ h: 230, s: 58, l: 50, a: 0.5 })).toBe(
      "hsl(230 58% 50% / 50%)",
    );
  });
});

describe("rgbaToHsla / hslaToRgba", () => {
  it("赤(255,0,0)はhsl(0,100%,50%)になる", () => {
    const hsla = rgbaToHsla({ r: 255, g: 0, b: 0, a: 1 });
    expect(hsla.h).toBeCloseTo(0);
    expect(hsla.s).toBeCloseTo(100);
    expect(hsla.l).toBeCloseTo(50);
  });

  it("白(255,255,255)はhsl(0,0%,100%)になる", () => {
    const hsla = rgbaToHsla({ r: 255, g: 255, b: 255, a: 1 });
    expect(hsla.s).toBeCloseTo(0);
    expect(hsla.l).toBeCloseTo(100);
  });

  it("灰色(無彩色)は彩度0になる", () => {
    const hsla = rgbaToHsla({ r: 128, g: 128, b: 128, a: 1 });
    expect(hsla.s).toBeCloseTo(0);
  });

  it("hslaToRgbaはrgbaToHslaの逆変換になる(往復で元の値に近い)", () => {
    const original = { r: 53, g: 82, b: 201, a: 0.7 };
    const roundTrip = hslaToRgba(rgbaToHsla(original));
    expect(roundTrip.r).toBeCloseTo(original.r, 0);
    expect(roundTrip.g).toBeCloseTo(original.g, 0);
    expect(roundTrip.b).toBeCloseTo(original.b, 0);
    expect(roundTrip.a).toBeCloseTo(original.a);
  });

  it("アルファはそのまま引き継がれる", () => {
    expect(rgbaToHsla({ r: 0, g: 0, b: 0, a: 0.3 }).a).toBe(0.3);
    expect(hslaToRgba({ h: 0, s: 0, l: 0, a: 0.3 }).a).toBe(0.3);
  });

  it("事前条件違反でRangeErrorを投げる", () => {
    expect(() => rgbaToHsla({ r: 256, g: 0, b: 0, a: 1 })).toThrow(RangeError);
    expect(() => hslaToRgba({ h: 400, s: 0, l: 0, a: 1 })).toThrow(RangeError);
  });
});
