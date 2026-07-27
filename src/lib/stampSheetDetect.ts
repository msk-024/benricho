import {
  assertValidImage,
  unionPixelRect,
  type PixelRect,
  type RgbaImage,
} from "./imageOps";

export interface StampSheetRegion extends PixelRect {
  id: string;
}

export interface DetectStampSheetRegionsOptions {
  /** この値を超えるアルファ値の画素を前景として扱う(以下は背景) */
  alphaThreshold?: number;
  /** この画素数未満の連結成分は除外する(ノイズ対策) */
  minArea?: number;
  /** bbox同士がこの距離以内なら1つのスタンプとして結合する */
  mergeDistance?: number;
}

/** パラメータのデフォルト値。UIのスライダー初期値としても利用する */
export const STAMP_SHEET_DETECTION_DEFAULTS = {
  alphaThreshold: 10,
  minArea: 64,
  mergeDistance: 20,
} as const;

interface RawRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  pixelCount: number;
}

const NEIGHBOR_OFFSETS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

/**
 * シート画像から個々のイラストの切り出し候補を検出する(アルファ値ベースの連結成分ラベリング)。
 *
 * @precondition image は正当な RGBA 画像
 * @precondition alphaThreshold は 0〜255、minArea・mergeDistance は 0 以上の有限数
 * @postcondition 戻り値は読み順(行を上→下、行内は左→右)に並ぶ
 * @postcondition 各領域の矩形は画像内に収まる
 * @throws {RangeError} 事前条件違反
 */
export function detectStampSheetRegions(
  image: RgbaImage,
  options: DetectStampSheetRegionsOptions = {},
): StampSheetRegion[] {
  assertValidImage(image);
  const alphaThreshold =
    options.alphaThreshold ?? STAMP_SHEET_DETECTION_DEFAULTS.alphaThreshold;
  const minArea = options.minArea ?? STAMP_SHEET_DETECTION_DEFAULTS.minArea;
  const mergeDistance =
    options.mergeDistance ?? STAMP_SHEET_DETECTION_DEFAULTS.mergeDistance;
  assertInRange(alphaThreshold, 0, 255, "alphaThreshold");
  assertNonNegative(minArea, "minArea");
  assertNonNegative(mergeDistance, "mergeDistance");

  const rawRegions = labelConnectedComponents(image, alphaThreshold);
  const significantRegions = rawRegions.filter(
    (region) => region.pixelCount >= minArea,
  );
  const mergedRegions = mergeNearbyRegions(significantRegions, mergeDistance);
  return sortInReadingOrder(mergedRegions).map((region, index) => ({
    id: `stamp-region-${index + 1}`,
    x: region.x,
    y: region.y,
    width: region.width,
    height: region.height,
  }));
}

/** アルファ値が閾値を超える画素を前景として8連結の連結成分に分割する(反復BFS) */
function labelConnectedComponents(
  image: RgbaImage,
  alphaThreshold: number,
): RawRegion[] {
  const { width, height, data } = image;
  const isForeground = (index: number): boolean =>
    data[index * 4 + 3] > alphaThreshold;
  const visited = new Uint8Array(width * height);
  const regions: RawRegion[] = [];

  for (let startIndex = 0; startIndex < width * height; startIndex++) {
    if (visited[startIndex] === 1 || !isForeground(startIndex)) continue;
    regions.push(
      collectComponent(width, height, isForeground, visited, startIndex),
    );
  }
  return regions;
}

function collectComponent(
  width: number,
  height: number,
  isForeground: (index: number) => boolean,
  visited: Uint8Array,
  startIndex: number,
): RawRegion {
  const queue = [startIndex];
  visited[startIndex] = 1;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let pixelCount = 0;
  let head = 0;
  while (head < queue.length) {
    const index = queue[head++];
    const x = index % width;
    const y = (index - x) / width;
    pixelCount++;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    for (const [dx, dy] of NEIGHBOR_OFFSETS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const neighborIndex = ny * width + nx;
      if (visited[neighborIndex] === 1 || !isForeground(neighborIndex))
        continue;
      visited[neighborIndex] = 1;
      queue.push(neighborIndex);
    }
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    pixelCount,
  };
}

/**
 * bboxを mergeDistance 分だけ膨張させて重なる領域同士を1つに結合する(反復的に安定するまで)。
 * キャラクター本体と離れた場所にある吹き出し・文字などを1スタンプとしてまとめる用途。
 */
function mergeNearbyRegions(
  regions: readonly RawRegion[],
  mergeDistance: number,
): RawRegion[] {
  const clusters = regions.map((region) => ({ ...region }));
  let didMerge = true;
  while (didMerge) {
    didMerge = false;
    outer: for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        if (isWithinMergeDistance(clusters[i], clusters[j], mergeDistance)) {
          clusters[i] = unionRawRegion(clusters[i], clusters[j]);
          clusters.splice(j, 1);
          didMerge = true;
          break outer;
        }
      }
    }
  }
  return clusters;
}

/** 2つの矩形の外側の隙間(Chebyshev距離、重なっていれば0)が mergeDistance 以内か判定する */
function isWithinMergeDistance(
  a: RawRegion,
  b: RawRegion,
  mergeDistance: number,
): boolean {
  const dx = Math.max(0, a.x - (b.x + b.width), b.x - (a.x + a.width));
  const dy = Math.max(0, a.y - (b.y + b.height), b.y - (a.y + a.height));
  return dx <= mergeDistance && dy <= mergeDistance;
}

function unionRawRegion(a: RawRegion, b: RawRegion): RawRegion {
  return { ...unionPixelRect(a, b), pixelCount: a.pixelCount + b.pixelCount };
}

/** 行(垂直方向のbbox重なり)を判定してグルーピングし、行=上→下・行内=左→右の順に並べる */
function sortInReadingOrder(regions: readonly RawRegion[]): RawRegion[] {
  const sorted = [...regions].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: RawRegion[][] = [];
  for (const region of sorted) {
    const currentRow = rows.at(-1);
    const fitsCurrentRow =
      currentRow !== undefined &&
      currentRow.some(
        (existing) => verticalOverlapRatio(existing, region) > 0.3,
      );
    if (fitsCurrentRow && currentRow !== undefined) {
      currentRow.push(region);
    } else {
      rows.push([region]);
    }
  }
  return rows.flatMap((row) => [...row].sort((a, b) => a.x - b.x));
}

/** 2矩形の垂直方向の重なりを、背の低い方の高さに対する割合で返す(重なりなしは0) */
function verticalOverlapRatio(a: RawRegion, b: RawRegion): number {
  const overlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  if (overlap <= 0) return 0;
  return overlap / Math.min(a.height, b.height);
}

function assertNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} は 0 以上の有限数が必要です: ${value}`);
  }
}

function assertInRange(
  value: number,
  min: number,
  max: number,
  name: string,
): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} は ${min}〜${max} が必要です: ${value}`);
  }
}
