import { describe, expect, it } from "vitest";
import {
  detectStampSheetRegions,
  STAMP_SHEET_DETECTION_DEFAULTS,
} from "./stampSheetDetect";
import type { RgbaImage } from "./imageOps";

function makeTransparentImage(width: number, height: number): RgbaImage {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

function fillRect(
  image: RgbaImage,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 255,
): void {
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const index = ((y + dy) * image.width + (x + dx)) * 4;
      image.data[index] = 10;
      image.data[index + 1] = 20;
      image.data[index + 2] = 30;
      image.data[index + 3] = alpha;
    }
  }
}

describe("detectStampSheetRegions", () => {
  it("明確に離れた2つの領域を2件として検出する", () => {
    const image = makeTransparentImage(100, 100);
    fillRect(image, 5, 5, 20, 20);
    fillRect(image, 60, 60, 20, 20);
    const regions = detectStampSheetRegions(image, { mergeDistance: 5 });
    expect(regions).toHaveLength(2);
    expect(regions[0]).toMatchObject({ x: 5, y: 5, width: 20, height: 20 });
    expect(regions[1]).toMatchObject({ x: 60, y: 60, width: 20, height: 20 });
    expect(new Set(regions.map((r) => r.id)).size).toBe(2);
  });

  it("minArea未満のゴミを除外する", () => {
    const image = makeTransparentImage(50, 50);
    fillRect(image, 5, 5, 20, 20); // 面積400
    fillRect(image, 40, 40, 2, 2); // 面積4、ゴミ想定
    const regions = detectStampSheetRegions(image, {
      minArea: 50,
      mergeDistance: 5,
    });
    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatchObject({ x: 5, y: 5, width: 20, height: 20 });
  });

  it("mergeDistance以内の2領域を1件に結合する", () => {
    const image = makeTransparentImage(100, 100);
    fillRect(image, 10, 10, 20, 20); // x: 10-29, y: 10-29
    fillRect(image, 35, 10, 10, 10); // x: 35-44, y: 10-19(隙間5px)
    const regions = detectStampSheetRegions(image, { mergeDistance: 10 });
    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatchObject({
      x: 10,
      y: 10,
      width: 35,
      height: 20,
    });
  });

  it("mergeDistanceを超える2領域は結合しない", () => {
    const image = makeTransparentImage(100, 100);
    fillRect(image, 10, 10, 20, 20);
    fillRect(image, 60, 10, 10, 10); // 隙間30px
    const regions = detectStampSheetRegions(image, { mergeDistance: 5 });
    expect(regions).toHaveLength(2);
  });

  it("alphaThreshold以下の半透明画素は背景として扱う", () => {
    const image = makeTransparentImage(30, 30);
    fillRect(image, 5, 5, 10, 10, 255);
    fillRect(image, 20, 5, 5, 5, 20); // 薄いアルファ(ノイズ想定)
    const regions = detectStampSheetRegions(image, { alphaThreshold: 30 });
    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatchObject({ x: 5, y: 5, width: 10, height: 10 });
  });

  it("読み順(行=上→下、行内=左→右)で返す", () => {
    const image = makeTransparentImage(100, 60);
    fillRect(image, 50, 5, 10, 10); // 1行目・右
    fillRect(image, 5, 5, 10, 10); // 1行目・左
    fillRect(image, 5, 40, 10, 10); // 2行目
    const regions = detectStampSheetRegions(image, {
      mergeDistance: 1,
      minArea: 1,
    });
    expect(regions.map((r) => `${r.x},${r.y}`)).toEqual([
      "5,5",
      "50,5",
      "5,40",
    ]);
  });

  it("デフォルト値でも実用的な2件検出ができる", () => {
    const image = makeTransparentImage(400, 400);
    fillRect(image, 20, 20, 150, 150);
    fillRect(image, 220, 220, 150, 150);
    const regions = detectStampSheetRegions(image);
    expect(regions).toHaveLength(2);
  });

  it("形状不正の画像でRangeErrorを投げる", () => {
    expect(() =>
      detectStampSheetRegions({
        width: 2,
        height: 2,
        data: new Uint8ClampedArray(3),
      }),
    ).toThrow(RangeError);
  });

  it("パラメータが範囲外ならRangeErrorを投げる", () => {
    const image = makeTransparentImage(10, 10);
    expect(() =>
      detectStampSheetRegions(image, { alphaThreshold: 256 }),
    ).toThrow(RangeError);
    expect(() => detectStampSheetRegions(image, { minArea: -1 })).toThrow(
      RangeError,
    );
    expect(() => detectStampSheetRegions(image, { mergeDistance: -1 })).toThrow(
      RangeError,
    );
  });
});

describe("STAMP_SHEET_DETECTION_DEFAULTS", () => {
  it("すべて非負の値を持つ", () => {
    expect(
      STAMP_SHEET_DETECTION_DEFAULTS.alphaThreshold,
    ).toBeGreaterThanOrEqual(0);
    expect(STAMP_SHEET_DETECTION_DEFAULTS.minArea).toBeGreaterThanOrEqual(0);
    expect(STAMP_SHEET_DETECTION_DEFAULTS.mergeDistance).toBeGreaterThanOrEqual(
      0,
    );
  });
});
