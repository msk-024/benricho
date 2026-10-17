import { describe, expect, it } from "vitest";
import { analyzeStampSheet } from "./stampSheetDetect";
import { assignGroupsToFrames, isolateFrameOwnership } from "./stampIsolate";
import type { PixelRect, RgbaImage } from "./imageOps";

function makeTransparentImage(width: number, height: number): RgbaImage {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

function fillRect(
  image: RgbaImage,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const index = ((y + dy) * image.width + (x + dx)) * 4;
      image.data[index] = 10;
      image.data[index + 1] = 20;
      image.data[index + 2] = 30;
      image.data[index + 3] = 255;
    }
  }
}

/** cropCanvas相当(Canvas非依存版): シートの矩形範囲だけを新しいRGBA画像として切り出す */
function cropImage(image: RgbaImage, rect: PixelRect): RgbaImage {
  const data = new Uint8ClampedArray(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y++) {
    for (let x = 0; x < rect.width; x++) {
      const srcIndex = ((rect.y + y) * image.width + (rect.x + x)) * 4;
      const dstIndex = (y * rect.width + x) * 4;
      data[dstIndex] = image.data[srcIndex];
      data[dstIndex + 1] = image.data[srcIndex + 1];
      data[dstIndex + 2] = image.data[srcIndex + 2];
      data[dstIndex + 3] = image.data[srcIndex + 3];
    }
  }
  return { width: rect.width, height: rect.height, data };
}

function alphaAt(image: RgbaImage, x: number, y: number): number {
  return image.data[(y * image.width + x) * 4 + 3];
}

describe("お隣の写り込み除去(assignGroupsToFrames + isolateFrameOwnership)", () => {
  // シート(50×30)に本体A(本体+吸着する葉っぱの破片) と 本体Bを離して配置する。
  // frame1はBの枠のつもりだが、少し左に寄りすぎてAの葉っぱと本体の一部まで覆ってしまっている
  // (「ソファの枠の右上に枝の葉っぱ」の再現: 手動調整やdetection後の枠が隣に食い込むケース)
  function buildScenario(): {
    sheet: RgbaImage;
    frame0: PixelRect;
    frame1: PixelRect;
  } {
    const sheet = makeTransparentImage(50, 30);
    fillRect(sheet, 0, 10, 20, 15); // 本体A: x0-19, y10-24
    fillRect(sheet, 22, 5, 2, 2); // 葉っぱ(Aに吸着する破片): x22-23, y5-6
    fillRect(sheet, 30, 10, 20, 15); // 本体B: x30-49, y10-24
    return {
      sheet,
      frame0: { x: 0, y: 5, width: 24, height: 20 }, // A+葉っぱのbboxちょうど
      frame1: { x: 18, y: 5, width: 32, height: 20 }, // 左に寄りすぎてAの一部と葉っぱまで含む
    };
  }

  it("検出グループごとに、画素が一番多く入っている枠を持ち主と判定する", () => {
    const { sheet, frame0, frame1 } = buildScenario();
    const { regions, ownerMap } = analyzeStampSheet(sheet, {
      attachDistance: 15,
      minArea: 1,
    });
    expect(regions).toHaveLength(2); // A+葉っぱで1グループ、Bで1グループ

    const groupOwnerFrameIndex = assignGroupsToFrames(
      ownerMap,
      regions,
      sheet.width,
      [frame0, frame1],
    );
    // A+葉っぱグループは画素の大半(304px)がframe0に収まるためframe0が持ち主
    // Bグループはframe1にしか収まらないためframe1が持ち主
    expect(groupOwnerFrameIndex).toEqual([0, 1]);
  });

  it("frame1(Bの枠のつもりが左に寄りすぎた枠)を切り出すと、Aの写り込み画素だけアルファ0になる", () => {
    const { sheet, frame0, frame1 } = buildScenario();
    const { regions, ownerMap } = analyzeStampSheet(sheet, {
      attachDistance: 15,
      minArea: 1,
    });
    const groupOwnerFrameIndex = assignGroupsToFrames(
      ownerMap,
      regions,
      sheet.width,
      [frame0, frame1],
    );

    const cropped = cropImage(sheet, frame1);
    const isolatedData = isolateFrameOwnership(
      cropped,
      frame1,
      1,
      sheet.width,
      ownerMap,
      groupOwnerFrameIndex,
    );
    const isolated: RgbaImage = {
      width: frame1.width,
      height: frame1.height,
      data: isolatedData,
    };

    // Aの本体の写り込み(シート上 x18-19, y10-24)はframe1内ではlocal x0-1
    expect(alphaAt(isolated, 0, 10 - frame1.y)).toBe(0);
    expect(alphaAt(isolated, 1, 24 - frame1.y)).toBe(0);
    // 葉っぱの写り込み(シート上 x22-23, y5-6)はframe1内ではlocal x4-5, y0-1
    expect(alphaAt(isolated, 22 - frame1.x, 0)).toBe(0);
    expect(alphaAt(isolated, 23 - frame1.x, 1)).toBe(0);

    // 本体B自身の画素(シート上 x30-49, y10-24)はそのまま残る
    expect(alphaAt(isolated, 30 - frame1.x, 10 - frame1.y)).toBe(255);
    expect(alphaAt(isolated, 49 - frame1.x, 24 - frame1.y)).toBe(255);
  });

  it("frame0(Aの正しい枠)を切り出しても、自分自身の画素は消されない", () => {
    const { sheet, frame0, frame1 } = buildScenario();
    const { regions, ownerMap } = analyzeStampSheet(sheet, {
      attachDistance: 15,
      minArea: 1,
    });
    const groupOwnerFrameIndex = assignGroupsToFrames(
      ownerMap,
      regions,
      sheet.width,
      [frame0, frame1],
    );

    const cropped = cropImage(sheet, frame0);
    const isolatedData = isolateFrameOwnership(
      cropped,
      frame0,
      0,
      sheet.width,
      ownerMap,
      groupOwnerFrameIndex,
    );
    const isolated: RgbaImage = {
      width: frame0.width,
      height: frame0.height,
      data: isolatedData,
    };

    // 本体Aの画素(シート上 x0, y10)はframe0内ではlocal(0,5)
    expect(alphaAt(isolated, 0, 10 - frame0.y)).toBe(255);
    // 葉っぱの画素(シート上 x22, y5)はframe0内ではlocal(22,0)
    expect(alphaAt(isolated, 22 - frame0.x, 5 - frame0.y)).toBe(255);
  });

  it("isolateFrameOwnership: croppedImageのサイズがframeと一致しなければRangeErrorを投げる", () => {
    const sheet = makeTransparentImage(10, 10);
    const frame: PixelRect = { x: 0, y: 0, width: 5, height: 5 };
    const wrongSizeCrop: RgbaImage = {
      width: 4,
      height: 5,
      data: new Uint8ClampedArray(4 * 5 * 4),
    };
    expect(() =>
      isolateFrameOwnership(
        wrongSizeCrop,
        frame,
        0,
        sheet.width,
        new Int32Array(100).fill(-1),
        [],
      ),
    ).toThrow(RangeError);
  });

  it("assignGroupsToFrames: どの枠とも重ならないグループは-1を返す", () => {
    const sheet = makeTransparentImage(30, 30);
    fillRect(sheet, 0, 0, 10, 10);
    const { regions, ownerMap } = analyzeStampSheet(sheet, {
      attachDistance: 5,
    });
    const farFrame: PixelRect = { x: 20, y: 20, width: 5, height: 5 };
    const result = assignGroupsToFrames(ownerMap, regions, sheet.width, [
      farFrame,
    ]);
    expect(result).toEqual([-1]);
  });
});
