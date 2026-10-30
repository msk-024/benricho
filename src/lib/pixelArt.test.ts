import { describe, expect, it } from "vitest";
import type { RgbaImage } from "./imageOps";
import {
  applyColorAdjustments,
  convertToPixelArt,
  downsampleToGrid,
  quantizeImageColors,
  quantizeToFixedPalette,
  replacePaletteColor,
} from "./pixelArt";

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

function getPixel(
  image: RgbaImage,
  x: number,
  y: number,
): [number, number, number, number] {
  const i = (y * image.width + x) * 4;
  return [
    image.data[i],
    image.data[i + 1],
    image.data[i + 2],
    image.data[i + 3],
  ];
}

describe("downsampleToGrid", () => {
  it("単色画像はどのマス目も同じ不透明色になる", () => {
    const image = makeImage(40, 40, [10, 20, 30, 255]);
    const grid = downsampleToGrid(image, 4, 4);
    expect(grid.width).toBe(4);
    expect(grid.height).toBe(4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(getPixel(grid, x, y)).toEqual([10, 20, 30, 255]);
      }
    }
  });

  it("全透明画像はどのマス目も透明になる", () => {
    const image = makeImage(10, 10, [255, 0, 0, 0]);
    const grid = downsampleToGrid(image, 2, 2);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        expect(getPixel(grid, x, y)[3]).toBe(0);
      }
    }
  });

  it("横長画像を正方形グリッドに収めると、はみ出た行は透過になる(アスペクト比維持)", () => {
    // 4x2 の画像を 2x2 グリッドへ: 収まるのは上段1行のみ、下段は透過
    const image = makeImage(4, 2, [100, 100, 100, 255]);
    const grid = downsampleToGrid(image, 2, 2);
    expect(getPixel(grid, 0, 0)[3]).toBe(255);
    expect(getPixel(grid, 1, 0)[3]).toBe(255);
    expect(getPixel(grid, 0, 1)[3]).toBe(0);
    expect(getPixel(grid, 1, 1)[3]).toBe(0);
  });

  it("代表色サンプリングはマス内で最も出現数が多い色を選ぶ", () => {
    // 2x1画像の1マス(1x1グリッド)に赤3・青1を敷き詰める
    const image = makeImage(4, 1, [0, 0, 0, 255]);
    setPixel(image, 0, 0, [255, 0, 0, 255]);
    setPixel(image, 1, 0, [255, 0, 0, 255]);
    setPixel(image, 2, 0, [255, 0, 0, 255]);
    setPixel(image, 3, 0, [0, 0, 255, 255]);
    const grid = downsampleToGrid(image, 1, 1, "dominant");
    expect(getPixel(grid, 0, 0)).toEqual([255, 0, 0, 255]);
  });

  it("事前条件違反でRangeErrorを投げる", () => {
    const image = makeImage(10, 10, [0, 0, 0, 255]);
    expect(() => downsampleToGrid(image, 0, 4)).toThrow(RangeError);
    expect(() => downsampleToGrid(image, 4, 1.5)).toThrow(RangeError);
    expect(() =>
      downsampleToGrid(
        { width: 2, height: 2, data: new Uint8ClampedArray(3) },
        2,
        2,
      ),
    ).toThrow(RangeError);
  });
});

describe("quantizeImageColors", () => {
  it("色数がmaxColors以下ならパレットは元の色そのまま", () => {
    const image = makeImage(2, 1, [0, 0, 0, 255]);
    setPixel(image, 0, 0, [255, 0, 0, 255]);
    setPixel(image, 1, 0, [0, 255, 0, 255]);
    const { image: result, palette } = quantizeImageColors(image, 8);
    expect(palette).toHaveLength(2);
    expect(getPixel(result, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(getPixel(result, 1, 0)).toEqual([0, 255, 0, 255]);
  });

  it("色数がmaxColorsを超える場合、パレットはmaxColors以下に圧縮され全画素がパレット色になる", () => {
    const image = makeImage(5, 1, [0, 0, 0, 255]);
    setPixel(image, 0, 0, [10, 10, 10, 255]);
    setPixel(image, 1, 0, [250, 10, 10, 255]);
    setPixel(image, 2, 0, [10, 250, 10, 255]);
    setPixel(image, 3, 0, [10, 10, 250, 255]);
    setPixel(image, 4, 0, [250, 250, 250, 255]);
    const { image: result, palette } = quantizeImageColors(image, 2);
    expect(palette.length).toBeLessThanOrEqual(2);
    const paletteKeys = new Set(palette.map((c) => `${c.r},${c.g},${c.b}`));
    for (let x = 0; x < 5; x++) {
      const [r, g, b, a] = getPixel(result, x, 0);
      expect(a).toBe(255);
      expect(paletteKeys.has(`${r},${g},${b}`)).toBe(true);
    }
  });

  it("実質透明な画素(alpha<16)はパレット計算から除外され、常に完全透過で出力される", () => {
    const image = makeImage(2, 1, [0, 0, 0, 255]);
    setPixel(image, 0, 0, [255, 0, 0, 255]);
    setPixel(image, 1, 0, [0, 0, 0, 5]);
    const { image: result, palette } = quantizeImageColors(image, 8);
    expect(palette).toEqual([{ r: 255, g: 0, b: 0 }]);
    expect(getPixel(result, 1, 0)).toEqual([0, 0, 0, 0]);
  });

  it("全画素が実質透明なら空パレット・全透過画像を返す", () => {
    const image = makeImage(3, 3, [100, 100, 100, 0]);
    const { image: result, palette } = quantizeImageColors(image, 8);
    expect(palette).toEqual([]);
    for (let i = 3; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(0);
    }
  });

  it("事前条件違反でRangeErrorを投げる", () => {
    const image = makeImage(2, 2, [0, 0, 0, 255]);
    expect(() => quantizeImageColors(image, 0)).toThrow(RangeError);
    expect(() => quantizeImageColors(image, 1.5)).toThrow(RangeError);
  });
});

describe("convertToPixelArt", () => {
  it("グリッド化と減色をまとめて行い、指定サイズ・色数以下の結果を返す", () => {
    const image = makeImage(50, 50, [0, 0, 0, 255]);
    for (let y = 0; y < 50; y++) {
      for (let x = 0; x < 50; x++) {
        setPixel(image, x, y, [
          (x * 5) % 256,
          (y * 5) % 256,
          (x + y) % 256,
          255,
        ]);
      }
    }
    const { image: result, palette } = convertToPixelArt(image, {
      gridWidth: 8,
      gridHeight: 8,
      colorCount: 6,
      sampling: "average",
    });
    expect(result.width).toBe(8);
    expect(result.height).toBe(8);
    expect(palette.length).toBeLessThanOrEqual(6);
  });

  it("コントラスト/彩度の調整つきでも指定サイズ・色数以下の結果を返す", () => {
    const image = makeImage(20, 20, [0, 0, 0, 255]);
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        setPixel(image, x, y, [(x * 10) % 256, (y * 10) % 256, 100, 255]);
      }
    }
    const { image: result, palette } = convertToPixelArt(image, {
      gridWidth: 4,
      gridHeight: 4,
      colorCount: 4,
      sampling: "average",
      contrastPercent: 40,
      saturationPercent: -30,
    });
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
    expect(palette.length).toBeLessThanOrEqual(4);
  });
});

describe("quantizeToFixedPalette", () => {
  it("各不透明画素を固定パレット内の最も近い色にマッピングする", () => {
    const image = makeImage(2, 1, [0, 0, 0, 255]);
    setPixel(image, 0, 0, [10, 10, 10, 255]); // 黒に近い
    setPixel(image, 1, 0, [240, 240, 240, 255]); // 白に近い
    const fixedPalette = [
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 255, b: 255 },
    ];
    const { image: result, palette } = quantizeToFixedPalette(
      image,
      fixedPalette,
    );
    expect(palette).toEqual(fixedPalette);
    expect(getPixel(result, 0, 0)).toEqual([0, 0, 0, 255]);
    expect(getPixel(result, 1, 0)).toEqual([255, 255, 255, 255]);
  });

  it("透明画素はそのまま透明を維持する", () => {
    const image = makeImage(1, 1, [255, 0, 0, 0]);
    const { image: result } = quantizeToFixedPalette(image, [
      { r: 0, g: 0, b: 0 },
    ]);
    expect(getPixel(result, 0, 0)[3]).toBe(0);
  });

  it("空パレットはRangeErrorを投げる", () => {
    const image = makeImage(1, 1, [0, 0, 0, 255]);
    expect(() => quantizeToFixedPalette(image, [])).toThrow(RangeError);
  });
});

describe("replacePaletteColor", () => {
  it("指定インデックスの色だけが新しい色に置き換わる", () => {
    const image = makeImage(2, 1, [0, 0, 0, 255]);
    setPixel(image, 0, 0, [255, 0, 0, 255]);
    setPixel(image, 1, 0, [0, 255, 0, 255]);
    const palette = [
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
    ];
    const { image: result, palette: nextPalette } = replacePaletteColor(
      image,
      palette,
      0,
      { r: 0, g: 0, b: 255 },
    );
    expect(nextPalette).toEqual([
      { r: 0, g: 0, b: 255 },
      { r: 0, g: 255, b: 0 },
    ]);
    expect(getPixel(result, 0, 0)).toEqual([0, 0, 255, 255]);
    expect(getPixel(result, 1, 0)).toEqual([0, 255, 0, 255]); // 無関係の色は不変
  });

  it("透明画素は置換対象にならない", () => {
    const image = makeImage(1, 1, [255, 0, 0, 0]);
    const { image: result } = replacePaletteColor(
      image,
      [{ r: 255, g: 0, b: 0 }],
      0,
      { r: 0, g: 0, b: 0 },
    );
    expect(getPixel(result, 0, 0)).toEqual([255, 0, 0, 0]);
  });

  it("範囲外のpaletteIndexはRangeErrorを投げる", () => {
    const image = makeImage(1, 1, [0, 0, 0, 255]);
    expect(() =>
      replacePaletteColor(image, [{ r: 0, g: 0, b: 0 }], 1, {
        r: 255,
        g: 255,
        b: 255,
      }),
    ).toThrow(RangeError);
  });
});

describe("applyColorAdjustments", () => {
  it("コントラスト0%・彩度0%は画像を変化させない", () => {
    const image = makeImage(2, 1, [0, 0, 0, 255]);
    setPixel(image, 0, 0, [10, 200, 50, 255]);
    const result = applyColorAdjustments(image, 0, 0);
    expect(getPixel(result, 0, 0)).toEqual([10, 200, 50, 255]);
  });

  it("彩度-100%はグレースケール(輝度ベース)になる", () => {
    const image = makeImage(1, 1, [255, 0, 0, 255]);
    const result = applyColorAdjustments(image, 0, -100);
    const [r, g, b] = getPixel(result, 0, 0);
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it("コントラスト+100%は128を基準に差を2倍に広げる", () => {
    const image = makeImage(1, 1, [178, 78, 128, 255]); // 128から+50,-50,±0
    const result = applyColorAdjustments(image, 100, 0);
    expect(getPixel(result, 0, 0)).toEqual([228, 28, 128, 255]);
  });

  it("透明画素(alpha=0)は変化しない", () => {
    const image = makeImage(1, 1, [10, 20, 30, 0]);
    const result = applyColorAdjustments(image, 80, 80);
    expect(getPixel(result, 0, 0)).toEqual([10, 20, 30, 0]);
  });

  it("事前条件違反でRangeErrorを投げる", () => {
    const image = makeImage(1, 1, [0, 0, 0, 255]);
    expect(() => applyColorAdjustments(image, 101, 0)).toThrow(RangeError);
    expect(() => applyColorAdjustments(image, 0, -101)).toThrow(RangeError);
  });
});
