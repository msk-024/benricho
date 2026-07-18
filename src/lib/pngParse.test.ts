import { describe, expect, it } from "vitest";
import { assertPngSize, isPng, readPngSize } from "./pngParse";
import { makeSyntheticPng } from "./testHelpers/syntheticImages";

describe("isPng", () => {
  it("PNGシグネチャを判定できる", () => {
    expect(isPng(makeSyntheticPng(1, 1))).toBe(true);
    expect(isPng(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(false);
    expect(isPng(new Uint8Array(0))).toBe(false);
  });
});

describe("readPngSize", () => {
  it("IHDRから実寸を読み取れる", () => {
    expect(readPngSize(makeSyntheticPng(370, 320))).toEqual({
      width: 370,
      height: 320,
    });
    expect(readPngSize(makeSyntheticPng(1, 1))).toEqual({
      width: 1,
      height: 1,
    });
  });

  it("PNG以外・不完全データでは例外を投げる", () => {
    expect(() => readPngSize(new Uint8Array([1, 2, 3]))).toThrow(
      "PNG形式ではありません",
    );
    expect(() => readPngSize(makeSyntheticPng(1, 1).subarray(0, 20))).toThrow(
      "不完全",
    );
  });
});

describe("assertPngSize(LINEスタンプのサイズ厳密検証)", () => {
  it("期待サイズと一致すれば正常終了する", () => {
    expect(() =>
      assertPngSize(makeSyntheticPng(240, 240), 240, 240),
    ).not.toThrow();
    expect(() => assertPngSize(makeSyntheticPng(96, 74), 96, 74)).not.toThrow();
  });

  it("1pxでもズレていれば例外を投げる", () => {
    expect(() => assertPngSize(makeSyntheticPng(241, 240), 240, 240)).toThrow(
      "出力サイズが不正",
    );
    expect(() => assertPngSize(makeSyntheticPng(240, 239), 240, 240)).toThrow(
      "出力サイズが不正",
    );
  });
});
