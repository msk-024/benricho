import { type RgbaImage, assertValidImage } from "./imageOps";
import { computeFitRect, type FitRect } from "./fitRect";

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export type PixelArtSampling = "average" | "dominant";

export interface PixelArtOptions {
  gridWidth: number;
  gridHeight: number;
  colorCount: number;
  sampling: PixelArtSampling;
}

export interface PixelArtResult {
  image: RgbaImage;
  palette: RgbColor[];
}

/** これ未満のアルファ値は「実質透明」とみなす(代表色サンプリング・パレット圧縮共通) */
const TRANSPARENT_ALPHA_THRESHOLD = 16;

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} は1以上の整数が必要です: ${value}`);
  }
}

/**
 * 画像をグリッド(ドット絵のマス目)にダウンサンプルする。
 * 元画像はアスペクト比を保ったままグリッド内に最大サイズで収まるよう配置し、
 * はみ出す余白部分のマス目は透過(alpha=0)にする。
 *
 * @precondition image は正当なRGBA画像、gridWidth/gridHeight は1以上の整数
 * @postcondition 戻り値は gridWidth×gridHeight のRGBA画像
 * @throws {RangeError} 事前条件に違反した場合
 */
export function downsampleToGrid(
  image: RgbaImage,
  gridWidth: number,
  gridHeight: number,
  sampling: PixelArtSampling = "average",
): RgbaImage {
  assertValidImage(image);
  assertPositiveInteger(gridWidth, "gridWidth");
  assertPositiveInteger(gridHeight, "gridHeight");

  const fitRect = computeFitRect(
    image.width,
    image.height,
    gridWidth,
    gridHeight,
    0,
  );
  const data = new Uint8ClampedArray(gridWidth * gridHeight * 4);

  for (let gy = 0; gy < gridHeight; gy++) {
    for (let gx = 0; gx < gridWidth; gx++) {
      const outIndex = (gy * gridWidth + gx) * 4;
      const cell = sampleCell(image, fitRect, gx, gy, sampling);
      data[outIndex] = cell.r;
      data[outIndex + 1] = cell.g;
      data[outIndex + 2] = cell.b;
      data[outIndex + 3] = cell.a;
    }
  }
  return { width: gridWidth, height: gridHeight, data };
}

interface SampledPixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

const TRANSPARENT_PIXEL: SampledPixel = { r: 0, g: 0, b: 0, a: 0 };

/** グリッドの1マスに対応する元画像の領域を切り出し、代表色を1色求める */
function sampleCell(
  image: RgbaImage,
  fitRect: FitRect,
  gx: number,
  gy: number,
  sampling: PixelArtSampling,
): SampledPixel {
  const ix0 = Math.max(gx, fitRect.x);
  const ix1 = Math.min(gx + 1, fitRect.x + fitRect.width);
  const iy0 = Math.max(gy, fitRect.y);
  const iy1 = Math.min(gy + 1, fitRect.y + fitRect.height);
  if (ix1 <= ix0 || iy1 <= iy0) return TRANSPARENT_PIXEL;

  const srcX0 = ((ix0 - fitRect.x) / fitRect.width) * image.width;
  const srcX1 = ((ix1 - fitRect.x) / fitRect.width) * image.width;
  const srcY0 = ((iy0 - fitRect.y) / fitRect.height) * image.height;
  const srcY1 = ((iy1 - fitRect.y) / fitRect.height) * image.height;

  const pxStart = Math.floor(srcX0);
  const pxEnd = Math.min(image.width, Math.max(pxStart + 1, Math.ceil(srcX1)));
  const pyStart = Math.floor(srcY0);
  const pyEnd = Math.min(image.height, Math.max(pyStart + 1, Math.ceil(srcY1)));

  return sampling === "dominant"
    ? sampleDominantColor(image, pxStart, pxEnd, pyStart, pyEnd)
    : sampleAverageColor(image, pxStart, pxEnd, pyStart, pyEnd);
}

/** アルファ加重平均色(半透明画素が周囲の色を薄めすぎないようにする) */
function sampleAverageColor(
  image: RgbaImage,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): SampledPixel {
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumA = 0;
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * image.width + x) * 4;
      const a = image.data[i + 3];
      sumR += image.data[i] * a;
      sumG += image.data[i + 1] * a;
      sumB += image.data[i + 2] * a;
      sumA += a;
      count++;
    }
  }
  if (count === 0 || sumA === 0) return TRANSPARENT_PIXEL;
  return {
    r: Math.round(sumR / sumA),
    g: Math.round(sumG / sumA),
    b: Math.round(sumB / sumA),
    a: Math.round(sumA / count),
  };
}

/** マス内で最も出現数が多い色(輪郭をくっきりさせたいドット絵向け) */
function sampleDominantColor(
  image: RgbaImage,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): SampledPixel {
  const counts = new Map<number, number>();
  let sumA = 0;
  let totalCount = 0;
  let opaqueCount = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * image.width + x) * 4;
      const a = image.data[i + 3];
      sumA += a;
      totalCount++;
      if (a < TRANSPARENT_ALPHA_THRESHOLD) continue;
      const key =
        (image.data[i] << 16) | (image.data[i + 1] << 8) | image.data[i + 2];
      counts.set(key, (counts.get(key) ?? 0) + 1);
      opaqueCount++;
    }
  }
  if (totalCount === 0 || opaqueCount === 0) return TRANSPARENT_PIXEL;

  let bestKey = -1;
  let bestCount = -1;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  }
  return {
    r: (bestKey >> 16) & 0xff,
    g: (bestKey >> 8) & 0xff,
    b: bestKey & 0xff,
    a: Math.round(sumA / totalCount),
  };
}

interface WeightedColor extends RgbColor {
  count: number;
}

interface ColorBox {
  colors: WeightedColor[];
}

/**
 * 画像の不透明画素をmedian-cut法で指定色数以下のパレットに圧縮する。
 * 実質透明な画素(alpha < 16)はパレット計算から除外し、常に完全透過として出力する。
 *
 * @precondition image は正当なRGBA画像、maxColors は1以上の整数
 * @postcondition 戻り値の palette の長さは maxColors 以下
 * @postcondition 不透明画素(alpha>=16)のRGBは必ず palette 内のいずれかの色と一致する
 * @throws {RangeError} 事前条件に違反した場合
 */
export function quantizeImageColors(
  image: RgbaImage,
  maxColors: number,
): PixelArtResult {
  assertValidImage(image);
  assertPositiveInteger(maxColors, "maxColors");

  const colorCounts = new Map<number, number>();
  for (let i = 0; i < image.data.length; i += 4) {
    if (image.data[i + 3] < TRANSPARENT_ALPHA_THRESHOLD) continue;
    const key =
      (image.data[i] << 16) | (image.data[i + 1] << 8) | image.data[i + 2];
    colorCounts.set(key, (colorCounts.get(key) ?? 0) + 1);
  }

  if (colorCounts.size === 0) {
    return {
      image: {
        width: image.width,
        height: image.height,
        data: new Uint8ClampedArray(image.data.length),
      },
      palette: [],
    };
  }

  const colors: WeightedColor[] = [...colorCounts.entries()].map(
    ([key, count]) => ({
      r: (key >> 16) & 0xff,
      g: (key >> 8) & 0xff,
      b: key & 0xff,
      count,
    }),
  );

  const palette: RgbColor[] =
    colors.length <= maxColors
      ? colors.map(({ r, g, b }) => ({ r, g, b }))
      : buildMedianCutPalette(colors, maxColors);

  const nearestByKey = new Map<number, RgbColor>();
  const data = new Uint8ClampedArray(image.data.length);
  for (let i = 0; i < image.data.length; i += 4) {
    const a = image.data[i + 3];
    if (a < TRANSPARENT_ALPHA_THRESHOLD) continue; // alpha=0のまま(初期値)
    const key =
      (image.data[i] << 16) | (image.data[i + 1] << 8) | image.data[i + 2];
    let nearest = nearestByKey.get(key);
    if (nearest === undefined) {
      nearest = findNearestColor(
        { r: (key >> 16) & 0xff, g: (key >> 8) & 0xff, b: key & 0xff },
        palette,
      );
      nearestByKey.set(key, nearest);
    }
    data[i] = nearest.r;
    data[i + 1] = nearest.g;
    data[i + 2] = nearest.b;
    data[i + 3] = a;
  }

  return {
    image: { width: image.width, height: image.height, data },
    palette,
  };
}

function buildMedianCutPalette(
  colors: WeightedColor[],
  maxColors: number,
): RgbColor[] {
  const boxes: ColorBox[] = [{ colors }];
  while (boxes.length < maxColors) {
    const splitIndex = findSplittableBoxIndex(boxes);
    if (splitIndex === -1) break;
    const [boxA, boxB] = splitBox(boxes[splitIndex]);
    boxes.splice(splitIndex, 1, boxA, boxB);
  }
  return boxes.map(averageBoxColor);
}

/** 分割に値する(=2色以上かつ色の幅がある)最大の箱を探す。無ければ -1 */
function findSplittableBoxIndex(boxes: ColorBox[]): number {
  let bestIndex = -1;
  let bestRange = 0;
  boxes.forEach((box, index) => {
    if (box.colors.length < 2) return;
    const { range } = boxChannelRange(box);
    if (range > bestRange) {
      bestRange = range;
      bestIndex = index;
    }
  });
  return bestIndex;
}

/** 箱の中でR/G/Bのうち最も値の幅が広いチャンネルとその幅を返す */
function boxChannelRange(box: ColorBox): {
  channel: "r" | "g" | "b";
  range: number;
} {
  let channel: "r" | "g" | "b" = "r";
  let maxRange = -1;
  for (const c of ["r", "g", "b"] as const) {
    let min = 255;
    let max = 0;
    for (const color of box.colors) {
      if (color[c] < min) min = color[c];
      if (color[c] > max) max = color[c];
    }
    const range = max - min;
    if (range > maxRange) {
      maxRange = range;
      channel = c;
    }
  }
  return { channel, range: maxRange };
}

/** 最も幅の広いチャンネルの中央値で箱を2つに分割する */
function splitBox(box: ColorBox): [ColorBox, ColorBox] {
  const { channel } = boxChannelRange(box);
  const sorted = [...box.colors].sort((a, b) => a[channel] - b[channel]);
  const mid = Math.floor(sorted.length / 2);
  return [{ colors: sorted.slice(0, mid) }, { colors: sorted.slice(mid) }];
}

/** 箱内の色を出現数で加重平均し、パレットの代表色を1つ求める */
function averageBoxColor(box: ColorBox): RgbColor {
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumCount = 0;
  for (const c of box.colors) {
    sumR += c.r * c.count;
    sumG += c.g * c.count;
    sumB += c.b * c.count;
    sumCount += c.count;
  }
  return {
    r: Math.round(sumR / sumCount),
    g: Math.round(sumG / sumCount),
    b: Math.round(sumB / sumCount),
  };
}

function findNearestColor(color: RgbColor, palette: RgbColor[]): RgbColor {
  let best = palette[0];
  let bestDistance = Infinity;
  for (const candidate of palette) {
    const dr = color.r - candidate.r;
    const dg = color.g - candidate.g;
    const db = color.b - candidate.b;
    const distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

/**
 * 画像をドット絵(グリッド化+減色パレット)に変換する一連の処理をまとめたエントリーポイント。
 *
 * @precondition image は正当なRGBA画像。gridWidth/gridHeight/colorCount は1以上の整数
 * @postcondition 戻り値の image は gridWidth×gridHeight、palette の長さは colorCount 以下
 * @throws {RangeError} 事前条件に違反した場合
 */
export function convertToPixelArt(
  image: RgbaImage,
  options: PixelArtOptions,
): PixelArtResult {
  const grid = downsampleToGrid(
    image,
    options.gridWidth,
    options.gridHeight,
    options.sampling,
  );
  return quantizeImageColors(grid, options.colorCount);
}
