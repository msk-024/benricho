import {
  assertValidImage,
  unionPixelRect,
  type PixelRect,
  type RgbaImage,
} from "./imageOps";

export interface StampSheetRegion extends PixelRect {
  id: string;
}

export interface StampSheetOwnership {
  regions: StampSheetRegion[];
  /** 画素ごとの持ち主 = regions のインデックス。背景・どの枠にも属さない画素は -1 */
  ownerMap: Int32Array;
}

export interface DetectStampSheetRegionsOptions {
  /** この値を超えるアルファ値の画素を前景として扱う(以下は背景) */
  alphaThreshold?: number;
  /** この画素数未満の連結成分は除外する(ノイズ対策) */
  minArea?: number;
  /**
   * 破片(本体より十分小さい成分)を本体に吸着させる最大距離(8近傍の歩数)。
   * 省略時は画像の短辺から自動計算する({@link computeDefaultAttachDistance})
   */
  attachDistance?: number;
  /** 最大成分との画素数比がこの値未満の成分を「破片」とみなす(0〜1) */
  fragmentRatio?: number;
}

/** パラメータのデフォルト値。attachDistanceは画像サイズ依存のため含まない */
export const STAMP_SHEET_DETECTION_DEFAULTS = {
  alphaThreshold: 10,
  minArea: 64,
  fragmentRatio: 0.03,
} as const;

interface RawComponent extends PixelRect {
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
 * 破片吸着距離(attachDistance)の既定値を、画像の短辺から自動計算する。
 * 固定pxにすると画像が小さいほど効きすぎる(逆に大きいほど効かない)ため、
 * 比率ベースにしてスケール不変な検出結果にする。
 *
 * @postcondition 戻り値は 3〜30 の整数
 */
export function computeDefaultAttachDistance(
  width: number,
  height: number,
): number {
  const shortSide = Math.min(width, height);
  const raw = shortSide * 0.015;
  return Math.round(Math.min(30, Math.max(3, raw)));
}

/**
 * シート画像から個々のイラストの切り出し候補を検出する({@link analyzeStampSheet}の薄いラッパー、互換維持用)。
 *
 * @precondition image は正当な RGBA 画像
 * @precondition alphaThreshold は 0〜255、minArea・attachDistance は 0 以上、fragmentRatio は 0〜1
 * @postcondition 戻り値は読み順(行を上→下、行内は左→右)に並ぶ
 * @postcondition 各領域の矩形は画像内に収まる
 * @throws {RangeError} 事前条件違反
 */
export function detectStampSheetRegions(
  image: RgbaImage,
  options: DetectStampSheetRegionsOptions = {},
): StampSheetRegion[] {
  return analyzeStampSheet(image, options).regions;
}

/**
 * シート画像を解析し、1イラストごとの枠(本体+吸着した破片)と、画素ごとの持ち主を返す。
 *
 * アルゴリズム:
 * 1. アルファ値基準の連結成分ラベリング(8連結)
 * 2. pixelCount < minArea の成分はノイズとして除外
 * 3. 残った成分のうち、最大成分の pixelCount × fragmentRatio 未満のものを「破片」、
 *    それ以外を「本体」とする(fragmentRatio <= 1 なので最大成分は必ず本体になる)
 * 4. 本体の全画素を起点にした多始点BFS(8近傍)を attachDistance 歩まで広げる。
 *    各破片は、自身の画素のうち最も早く(最短距離で)本体に届いた画素の持ち主を、
 *    破片全体の持ち主とする。attachDistance 以内にどの本体も届かない破片は捨てる
 * 5. 本体 + 吸着した破片の bbox を統合して枠とし、読み順(上→下・行内は左→右)で並べる
 *
 * bbox同士の重なりで結合する旧方式(mergeDistance)は、横長のイラストのbboxが隣の
 * bboxと最初から重なり、結合→bbox拡大→さらに重なる…と連鎖して全体が1枠になる
 * 問題があったため、画素間の実距離で判定するこの方式に置き換えた。
 *
 * @precondition image は正当なRGBA画像
 * @precondition alphaThreshold は 0〜255、minArea・attachDistance は 0 以上、fragmentRatio は 0〜1
 * @postcondition regions は読み順に並ぶ。ownerMap は image と同じ画素数(width*height)
 * @throws {RangeError} 事前条件違反
 */
export function analyzeStampSheet(
  image: RgbaImage,
  options: DetectStampSheetRegionsOptions = {},
): StampSheetOwnership {
  assertValidImage(image);
  const alphaThreshold =
    options.alphaThreshold ?? STAMP_SHEET_DETECTION_DEFAULTS.alphaThreshold;
  const minArea = options.minArea ?? STAMP_SHEET_DETECTION_DEFAULTS.minArea;
  const fragmentRatio =
    options.fragmentRatio ?? STAMP_SHEET_DETECTION_DEFAULTS.fragmentRatio;
  const attachDistance =
    options.attachDistance ??
    computeDefaultAttachDistance(image.width, image.height);
  assertInRange(alphaThreshold, 0, 255, "alphaThreshold");
  assertNonNegative(minArea, "minArea");
  assertInRange(fragmentRatio, 0, 1, "fragmentRatio");
  assertNonNegative(attachDistance, "attachDistance");

  const { width, height, data } = image;
  const pixelTotal = width * height;
  const isForeground = (index: number): boolean =>
    data[index * 4 + 3] > alphaThreshold;

  const labelMap = new Int32Array(pixelTotal).fill(-1);
  const components: RawComponent[] = [];
  for (let index = 0; index < pixelTotal; index++) {
    if (labelMap[index] !== -1 || !isForeground(index)) continue;
    components.push(
      collectComponent(
        width,
        height,
        isForeground,
        labelMap,
        components.length,
        index,
      ),
    );
  }

  const ownerMap = new Int32Array(pixelTotal).fill(-1);
  const significantComponentIndices = components
    .map((_component, index) => index)
    .filter((index) => components[index].pixelCount >= minArea);

  if (significantComponentIndices.length === 0) {
    return { regions: [], ownerMap };
  }

  const maxPixelCount = Math.max(
    ...significantComponentIndices.map((index) => components[index].pixelCount),
  );
  const bodyComponentIndices = significantComponentIndices.filter(
    (index) => components[index].pixelCount >= maxPixelCount * fragmentRatio,
  );
  const fragmentComponentIndices = significantComponentIndices.filter(
    (index) => components[index].pixelCount < maxPixelCount * fragmentRatio,
  );

  const { owner: bfsOwner, distance: bfsDistance } = runMultiSourceBfs(
    labelMap,
    width,
    height,
    bodyComponentIndices,
    attachDistance,
  );

  // 本体ごとのbbox(吸着した破片を統合)と、破片→本体(componentインデックス)の所属を決定する
  const bodyRegions = new Map<number, PixelRect>();
  for (const bodyIndex of bodyComponentIndices) {
    bodyRegions.set(bodyIndex, { ...components[bodyIndex] });
  }
  const fragmentOwnerByComponent = new Map<number, number>();
  for (const fragmentIndex of fragmentComponentIndices) {
    const owner = findClosestBodyForFragment(
      labelMap,
      bfsOwner,
      bfsDistance,
      components[fragmentIndex],
      width,
      fragmentIndex,
    );
    if (owner === -1) continue; // attachDistance以内に本体がない → 捨てる
    const current = bodyRegions.get(owner);
    if (current === undefined) continue; // 理論上到達しない(ownerは必ずbodyComponentIndicesの要素)
    bodyRegions.set(owner, unionPixelRect(current, components[fragmentIndex]));
    fragmentOwnerByComponent.set(fragmentIndex, owner);
  }

  // 本体を読み順に並べ、最終regionsインデックスを確定する
  const bodyEntries = [...bodyRegions.entries()].map(
    ([componentIndex, rect]) => ({ componentIndex, ...rect }),
  );
  const sortedBodies = sortInReadingOrder(bodyEntries);
  const regions: StampSheetRegion[] = sortedBodies.map((entry, index) => ({
    id: `stamp-region-${index + 1}`,
    x: entry.x,
    y: entry.y,
    width: entry.width,
    height: entry.height,
  }));
  const regionIndexByComponentIndex = new Map<number, number>();
  sortedBodies.forEach((entry, index) => {
    regionIndexByComponentIndex.set(entry.componentIndex, index);
  });

  // ownerMapを構築: 本体自身の画素 + 吸着した破片の画素を、最終regionsインデックスで埋める
  for (let index = 0; index < pixelTotal; index++) {
    const componentIndex = labelMap[index];
    if (componentIndex === -1) continue;
    const bodyComponentIndex = bodyRegions.has(componentIndex)
      ? componentIndex
      : fragmentOwnerByComponent.get(componentIndex);
    if (bodyComponentIndex === undefined) continue;
    const regionIndex = regionIndexByComponentIndex.get(bodyComponentIndex);
    if (regionIndex !== undefined) ownerMap[index] = regionIndex;
  }

  return { regions, ownerMap };
}

/** アルファ値が閾値を超える画素を前景として8連結の連結成分に分割する(反復BFS、labelMapに成分インデックスを書き込む) */
function collectComponent(
  width: number,
  height: number,
  isForeground: (index: number) => boolean,
  labelMap: Int32Array,
  componentIndex: number,
  startIndex: number,
): RawComponent {
  const queue = [startIndex];
  labelMap[startIndex] = componentIndex;
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
      if (labelMap[neighborIndex] !== -1 || !isForeground(neighborIndex))
        continue;
      labelMap[neighborIndex] = componentIndex;
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
 * 本体の全画素を起点に、attachDistance歩(8近傍)まで多始点BFSを行い、各画素について
 * 「最初に届いた本体のcomponentインデックス」と「その距離」を求める。
 * 本体以外の画素(破片・背景)のみが拡張対象になる(本体画素は距離0で既に確定済みのため
 * 上書きされない。複数の本体から同距離で到達する場合はBFSのキュー順で先勝ちになる)。
 */
function runMultiSourceBfs(
  labelMap: Int32Array,
  width: number,
  height: number,
  bodyComponentIndices: readonly number[],
  attachDistance: number,
): { owner: Int32Array; distance: Int32Array } {
  const pixelTotal = width * height;
  const owner = new Int32Array(pixelTotal).fill(-1);
  const distance = new Int32Array(pixelTotal).fill(-1);
  const bodySet = new Set(bodyComponentIndices);
  const queue: number[] = [];
  for (let index = 0; index < pixelTotal; index++) {
    if (!bodySet.has(labelMap[index])) continue;
    owner[index] = labelMap[index];
    distance[index] = 0;
    queue.push(index);
  }
  let head = 0;
  while (head < queue.length) {
    const index = queue[head++];
    const currentDistance = distance[index];
    if (currentDistance >= attachDistance) continue;
    const x = index % width;
    const y = (index - x) / width;
    const ownerIndex = owner[index];
    for (const [dx, dy] of NEIGHBOR_OFFSETS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const neighborIndex = ny * width + nx;
      if (owner[neighborIndex] !== -1) continue; // 既により近い本体に到達済み
      owner[neighborIndex] = ownerIndex;
      distance[neighborIndex] = currentDistance + 1;
      queue.push(neighborIndex);
    }
  }
  return { owner, distance };
}

/**
 * 破片の画素のうち、本体BFSで最も早く(最短距離で)到達した画素の持ち主を、
 * 破片全体の持ち主として返す。1画素も attachDistance 以内に届かなければ -1
 */
function findClosestBodyForFragment(
  labelMap: Int32Array,
  bfsOwner: Int32Array,
  bfsDistance: Int32Array,
  fragmentBounds: PixelRect,
  width: number,
  fragmentComponentIndex: number,
): number {
  let bestDistance = Infinity;
  let bestOwner = -1;
  for (
    let y = fragmentBounds.y;
    y < fragmentBounds.y + fragmentBounds.height;
    y++
  ) {
    for (
      let x = fragmentBounds.x;
      x < fragmentBounds.x + fragmentBounds.width;
      x++
    ) {
      const index = y * width + x;
      if (labelMap[index] !== fragmentComponentIndex) continue;
      if (bfsOwner[index] === -1) continue;
      if (bfsDistance[index] < bestDistance) {
        bestDistance = bfsDistance[index];
        bestOwner = bfsOwner[index];
      }
    }
  }
  return bestOwner;
}

/** 行(垂直方向のbbox重なり)を判定してグルーピングし、行=上→下・行内=左→右の順に並べる */
function sortInReadingOrder<T extends PixelRect>(regions: readonly T[]): T[] {
  const sorted = [...regions].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: T[][] = [];
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
function verticalOverlapRatio(a: PixelRect, b: PixelRect): number {
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
