import { describe, expect, it } from "vitest";
import {
  computeDefaultAttachDistance,
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
    const regions = detectStampSheetRegions(image, { attachDistance: 5 });
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
      attachDistance: 5,
    });
    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatchObject({ x: 5, y: 5, width: 20, height: 20 });
  });

  it("bboxは重なるが画素は離れている2図形(L字と、そのくぼみに置いた正方形)は2件のまま結合しない", () => {
    const image = makeTransparentImage(40, 40);
    // L字: 縦棒(x:0-4,y:0-19) + 横棒(x:0-19,y:15-19) → bboxは(0,0,20,20)、175px
    fillRect(image, 0, 0, 5, 20);
    fillRect(image, 0, 15, 20, 5);
    // L字の「くぼみ」(x:5-19,y:0-14)の中に、L字から離れた正方形(100px、本体扱いの大きさ)を置く
    // → bboxはL字のbboxに完全に内包される
    fillRect(image, 8, 2, 10, 10);
    const regions = detectStampSheetRegions(image, { attachDistance: 2 });
    // 旧(bbox結合)方式ならbbox重なりで1件に潰れていたはずの構図
    expect(regions).toHaveLength(2);
    const bboxes = regions.map((r) => `${r.x},${r.y},${r.width},${r.height}`);
    expect(bboxes).toContain("0,0,20,20");
    expect(bboxes).toContain("8,2,10,10");
  });

  it("bboxが連鎖的に重なる(=隙間が近い)3図形も3件のまま結合しない(再現済みバグの回帰防止)", () => {
    const image = makeTransparentImage(60, 30);
    // 隙間5pxごとに3本の横棒を積む。旧mergeDistance(既定20)方式では
    // 隣接ペアが次々に結合距離内に入り、最終的に全部が1つのbboxへ連鎖結合していた
    fillRect(image, 0, 0, 50, 5); // y:0-4
    fillRect(image, 0, 10, 50, 5); // y:10-14(すき間5px)
    fillRect(image, 0, 20, 50, 5); // y:20-24(すき間5px)
    const regions = detectStampSheetRegions(image, { attachDistance: 10 });
    expect(regions).toHaveLength(3);
    expect(regions.map((r) => r.y)).toEqual([0, 10, 20]);
  });

  it("本体のすぐ近くの小さな破片は本体に吸着し、件数は増えずbboxが広がる", () => {
    const image = makeTransparentImage(40, 25);
    fillRect(image, 0, 0, 20, 20); // 本体 400px
    fillRect(image, 25, 0, 3, 3); // 破片 9px(本体から5pxのすき間、minAreaの既定64未満なので明示的に下げる)
    const regions = detectStampSheetRegions(image, {
      minArea: 1,
      attachDistance: 10,
      fragmentRatio: 0.03,
    });
    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatchObject({ x: 0, y: 0, width: 28, height: 20 });
  });

  it("どの本体からも遠い破片は捨てられる(本体bboxは広がらない)", () => {
    const image = makeTransparentImage(80, 80);
    fillRect(image, 0, 0, 20, 20); // 本体 400px
    fillRect(image, 60, 60, 3, 3); // 本体から遠い破片 9px(minAreaの既定64未満なので明示的に下げる)
    const regions = detectStampSheetRegions(image, {
      minArea: 1,
      attachDistance: 5,
      fragmentRatio: 0.03,
    });
    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatchObject({ x: 0, y: 0, width: 20, height: 20 });
  });

  it("スケール不変: 本体+近接破片の配置を4倍に拡大しても、既定値(自動計算)で同じ吸着結果になる", () => {
    const base = makeTransparentImage(200, 200);
    fillRect(base, 0, 0, 40, 40); // 本体 1600px
    fillRect(base, 41, 0, 5, 5); // 破片(本体から1pxのすき間) 25px
    expect(detectStampSheetRegions(base, { minArea: 1 })).toHaveLength(1);

    const scaled = makeTransparentImage(800, 800);
    fillRect(scaled, 0, 0, 160, 160); // 本体を4倍
    fillRect(scaled, 164, 0, 20, 20); // 破片を4倍(すき間も4倍の4px)
    expect(detectStampSheetRegions(scaled, { minArea: 1 })).toHaveLength(1);
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
      attachDistance: 1,
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
    expect(() =>
      detectStampSheetRegions(image, { attachDistance: -1 }),
    ).toThrow(RangeError);
    expect(() =>
      detectStampSheetRegions(image, { fragmentRatio: 1.5 }),
    ).toThrow(RangeError);
    expect(() =>
      detectStampSheetRegions(image, { fragmentRatio: -0.1 }),
    ).toThrow(RangeError);
  });
});

describe("computeDefaultAttachDistance", () => {
  it("短辺を基準に3〜30pxへクランプする", () => {
    expect(computeDefaultAttachDistance(100, 100)).toBe(3); // 100*1.5%=1.5 → 下限3
    expect(computeDefaultAttachDistance(2000, 2000)).toBe(30); // 2000*1.5%=30 → 上限ぴったり
    expect(computeDefaultAttachDistance(4000, 4000)).toBe(30); // 上限30でクランプ
    expect(computeDefaultAttachDistance(1000, 500)).toBe(
      computeDefaultAttachDistance(500, 1000),
    ); // 短辺基準なので縦横入替で同じ
  });
});

describe("STAMP_SHEET_DETECTION_DEFAULTS", () => {
  it("すべて非負の値を持つ", () => {
    expect(
      STAMP_SHEET_DETECTION_DEFAULTS.alphaThreshold,
    ).toBeGreaterThanOrEqual(0);
    expect(STAMP_SHEET_DETECTION_DEFAULTS.minArea).toBeGreaterThanOrEqual(0);
    expect(STAMP_SHEET_DETECTION_DEFAULTS.fragmentRatio).toBeGreaterThanOrEqual(
      0,
    );
    expect(STAMP_SHEET_DETECTION_DEFAULTS.fragmentRatio).toBeLessThanOrEqual(1);
  });
});
