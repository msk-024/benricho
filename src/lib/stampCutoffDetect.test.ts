import { describe, expect, it } from "vitest";
import {
  detectContentCutoff,
  hasAnyCutoff,
  type CutoffEdges,
} from "./stampCutoffDetect";
import type { RgbaImage } from "./imageOps";

/** テスト用の単色画像を生成する */
function makeImage(width: number, height: number, alpha: number): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data.set([0, 0, 0, alpha], i * 4);
  }
  return { width, height, data };
}

function fillRect(
  image: RgbaImage,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha: number,
): void {
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      image.data.set([0, 0, 0, alpha], ((y + dy) * image.width + x + dx) * 4);
    }
  }
}

describe("detectContentCutoff", () => {
  it("frameの外側まで絵が続いている辺はtrueになる(タイトなbboxの境界線上は無視する)", () => {
    // 20x20の透明シートに10x10の不透明な絵を描き、frameをその絵のタイトなbboxに設定する
    // → 境界線上(frame内)には画素があるが、外側には何もないので全辺false
    const image = makeImage(20, 20, 0);
    fillRect(image, 5, 5, 10, 10, 255);
    const edges = detectContentCutoff(image, {
      x: 5,
      y: 5,
      width: 10,
      height: 10,
    });
    expect(edges).toEqual({
      top: false,
      bottom: false,
      left: false,
      right: false,
    });
  });

  it("絵がframeの外(上)まで続いている場合はtopがtrueになる", () => {
    const image = makeImage(20, 20, 0);
    // 絵がy=2から始まるが、frameはy=5から(=実際はframeの上でさらに絵が続いている)
    fillRect(image, 5, 2, 10, 13, 255);
    const edges = detectContentCutoff(image, {
      x: 5,
      y: 5,
      width: 10,
      height: 10,
    });
    expect(edges.top).toBe(true);
    expect(edges.bottom).toBe(false);
    expect(edges.left).toBe(false);
    expect(edges.right).toBe(false);
  });

  it("絵がframeの外(右)まで続いている場合はrightがtrueになる", () => {
    const image = makeImage(20, 20, 0);
    fillRect(image, 5, 5, 13, 10, 255);
    const edges = detectContentCutoff(image, {
      x: 5,
      y: 5,
      width: 10,
      height: 10,
    });
    expect(edges.right).toBe(true);
    expect(edges.top).toBe(false);
    expect(edges.bottom).toBe(false);
    expect(edges.left).toBe(false);
  });

  it("frameが画像全体と一致する場合(LineStampToolのケース)は境界行/列自体で判定する", () => {
    const image = makeImage(10, 10, 0);
    fillRect(image, 0, 0, 10, 10, 255); // 画像全体が絵(=端まで絵が接している)
    const full = { x: 0, y: 0, width: 10, height: 10 };
    expect(detectContentCutoff(image, full)).toEqual({
      top: true,
      bottom: true,
      left: true,
      right: true,
    });
  });

  it("frameが画像全体でも絵が内側に収まっていれば全辺false", () => {
    const image = makeImage(10, 10, 0);
    fillRect(image, 2, 2, 6, 6, 255);
    const full = { x: 0, y: 0, width: 10, height: 10 };
    expect(detectContentCutoff(image, full)).toEqual({
      top: false,
      bottom: false,
      left: false,
      right: false,
    });
  });

  it("alphaThresholdでアンチエイリアス等の弱い画素を無視できる", () => {
    const image = makeImage(20, 20, 0);
    fillRect(image, 5, 5, 10, 10, 255);
    fillRect(image, 5, 2, 10, 3, 5); // frameの外側(上)に薄い画素のみ
    expect(
      detectContentCutoff(
        image,
        { x: 5, y: 5, width: 10, height: 10 },
        { alphaThreshold: 10 },
      ).top,
    ).toBe(false);
    expect(
      detectContentCutoff(
        image,
        { x: 5, y: 5, width: 10, height: 10 },
        { alphaThreshold: 1 },
      ).top,
    ).toBe(true);
  });

  it("frameがimage内に収まらない場合はRangeErrorを投げる", () => {
    const image = makeImage(10, 10, 255);
    expect(() =>
      detectContentCutoff(image, { x: -1, y: 0, width: 5, height: 5 }),
    ).toThrow(RangeError);
    expect(() =>
      detectContentCutoff(image, { x: 8, y: 0, width: 5, height: 5 }),
    ).toThrow(RangeError);
    expect(() =>
      detectContentCutoff(image, { x: 0, y: 0, width: 0, height: 5 }),
    ).toThrow(RangeError);
  });

  it("alphaThreshold/bandPxが範囲外ならRangeErrorを投げる", () => {
    const image = makeImage(10, 10, 255);
    const frame = { x: 0, y: 0, width: 10, height: 10 };
    expect(() =>
      detectContentCutoff(image, frame, { alphaThreshold: 256 }),
    ).toThrow(RangeError);
    expect(() => detectContentCutoff(image, frame, { bandPx: 0 })).toThrow(
      RangeError,
    );
    expect(() => detectContentCutoff(image, frame, { bandPx: 1.5 })).toThrow(
      RangeError,
    );
  });
});

describe("hasAnyCutoff", () => {
  it("いずれかの辺がtrueならtrue", () => {
    const allFalse: CutoffEdges = {
      top: false,
      bottom: false,
      left: false,
      right: false,
    };
    expect(hasAnyCutoff(allFalse)).toBe(false);
    expect(hasAnyCutoff({ ...allFalse, right: true })).toBe(true);
  });
});
