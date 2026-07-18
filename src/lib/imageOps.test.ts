import { describe, expect, it } from "vitest";
import {
  detectContentRect,
  findOpaqueBounds,
  hasAnyTransparency,
  removeBackgroundByFloodFill,
  type RgbaImage,
} from "./imageOps";

/** テスト用の単色画像を生成する */
function makeImage(
  width: number,
  height: number,
  rgba: readonly [number, number, number, number],
): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set(rgba, i * 4);
  return { width, height, data };
}

function setPixel(
  image: RgbaImage,
  x: number,
  y: number,
  rgba: readonly [number, number, number, number],
): void {
  image.data.set(rgba, (y * image.width + x) * 4);
}

function getAlpha(
  image: RgbaImage,
  x: number,
  y: number,
  data?: Uint8ClampedArray,
): number {
  return (data ?? image.data)[(y * image.width + x) * 4 + 3];
}

describe("findOpaqueBounds", () => {
  it("不透明画素の最小外接矩形を返す", () => {
    const image = makeImage(10, 8, [0, 0, 0, 0]);
    setPixel(image, 2, 1, [255, 0, 0, 255]);
    setPixel(image, 7, 5, [0, 255, 0, 128]);
    expect(findOpaqueBounds(image)).toEqual({
      x: 2,
      y: 1,
      width: 6,
      height: 5,
    });
  });

  it("全画素が透明なら null を返す", () => {
    expect(findOpaqueBounds(makeImage(4, 4, [255, 255, 255, 0]))).toBeNull();
  });

  it("形状不正の画像で RangeError を投げる", () => {
    expect(() =>
      findOpaqueBounds({ width: 2, height: 2, data: new Uint8ClampedArray(3) }),
    ).toThrow(RangeError);
  });
});

describe("hasAnyTransparency", () => {
  it("透過画素の有無を判定する", () => {
    expect(hasAnyTransparency(makeImage(3, 3, [1, 2, 3, 255]))).toBe(false);
    const image = makeImage(3, 3, [1, 2, 3, 255]);
    setPixel(image, 1, 1, [1, 2, 3, 254]);
    expect(hasAnyTransparency(image)).toBe(true);
  });
});

describe("removeBackgroundByFloodFill", () => {
  it("四隅と連結した背景色だけを透過し、被写体は保護する", () => {
    // 白背景に赤い正方形(2..5, 2..5)を描く
    const image = makeImage(8, 8, [255, 255, 255, 255]);
    for (let y = 2; y <= 5; y++) {
      for (let x = 2; x <= 5; x++) setPixel(image, x, y, [200, 30, 30, 255]);
    }
    const result = removeBackgroundByFloodFill(image, 16);
    expect(getAlpha(image, 0, 0, result.data)).toBe(0);
    expect(getAlpha(image, 7, 7, result.data)).toBe(0);
    expect(getAlpha(image, 3, 3, result.data)).toBe(255);
    expect(result.removedPixelCount).toBe(8 * 8 - 4 * 4);
    // 元データは変更されない(純粋関数)
    expect(getAlpha(image, 0, 0)).toBe(255);
  });

  it("被写体内部の背景類似色(非連結領域)は透過しない", () => {
    const image = makeImage(9, 9, [255, 255, 255, 255]);
    // 外周ぎわに壁を作り、中央の白は非連結にする
    for (let y = 1; y <= 7; y++) {
      for (let x = 1; x <= 7; x++) setPixel(image, x, y, [10, 10, 10, 255]);
    }
    setPixel(image, 4, 4, [255, 255, 255, 255]);
    const result = removeBackgroundByFloodFill(image, 16);
    expect(getAlpha(image, 4, 4, result.data)).toBe(255);
    expect(getAlpha(image, 0, 4, result.data)).toBe(0);
  });

  it("tolerance が範囲外なら RangeError を投げる", () => {
    expect(() =>
      removeBackgroundByFloodFill(makeImage(2, 2, [0, 0, 0, 255]), -1),
    ).toThrow(RangeError);
    expect(() =>
      removeBackgroundByFloodFill(makeImage(2, 2, [0, 0, 0, 255]), 256),
    ).toThrow(RangeError);
  });
});

describe("detectContentRect", () => {
  it("均一色の余白を除いたコンテンツ矩形を返す", () => {
    const image = makeImage(12, 10, [240, 240, 240, 255]);
    for (let y = 3; y <= 6; y++) {
      for (let x = 4; x <= 9; x++) setPixel(image, x, y, [20, 80, 160, 255]);
    }
    expect(detectContentRect(image, 10)).toEqual({
      x: 4,
      y: 3,
      width: 6,
      height: 4,
    });
  });

  it("全面が余白色なら null を返す", () => {
    expect(
      detectContentRect(makeImage(5, 5, [255, 255, 255, 255]), 10),
    ).toBeNull();
  });

  it("わずかな色ムラは tolerance で吸収する", () => {
    const image = makeImage(6, 6, [240, 240, 240, 255]);
    setPixel(image, 0, 0, [236, 242, 238, 255]);
    setPixel(image, 3, 3, [0, 0, 0, 255]);
    expect(detectContentRect(image, 12)).toEqual({
      x: 3,
      y: 3,
      width: 1,
      height: 1,
    });
  });
});
