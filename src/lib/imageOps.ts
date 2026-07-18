/** Canvas 非依存で扱える RGBA 画像表現(テスト容易性のため ImageData と構造互換) */
export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BackgroundRemovalResult {
  /** ArrayBuffer 固定なのは new ImageData() の引数型(ImageDataArray)に合わせるため */
  data: Uint8ClampedArray<ArrayBuffer>;
  removedPixelCount: number;
}

function assertValidImage(image: RgbaImage): void {
  if (
    image.width < 1 ||
    image.height < 1 ||
    image.data.length !== image.width * image.height * 4
  ) {
    throw new RangeError("RGBA画像データの形状が不正です");
  }
}

/**
 * アルファ値が閾値以上の画素を含む最小外接矩形を求める(透過画像の実体領域検出)。
 *
 * @precondition image は正当な RGBA 画像、alphaThreshold は 1〜255
 * @postcondition 戻り値の矩形は画像内に収まる。全画素が透明なら null
 * @throws {RangeError} 画像形状が不正な場合
 */
export function findOpaqueBounds(
  image: RgbaImage,
  alphaThreshold = 1,
): PixelRect | null {
  assertValidImage(image);
  const { width, height, data } = image;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < alphaThreshold) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** 1 画素でも透過(アルファ < 255)を含むか判定する */
export function hasAnyTransparency(image: RgbaImage): boolean {
  assertValidImage(image);
  for (let i = 3; i < image.data.length; i += 4) {
    if (image.data[i] < 255) return true;
  }
  return false;
}

/**
 * 四隅を起点としたフラッドフィルで背景を透過化する。
 * 起点の隅と色が近い(許容差内の)連結領域のみアルファ 0 にするため、
 * 被写体内部の類似色は保護される。
 *
 * @precondition image は正当な RGBA 画像、tolerance は 0〜255
 * @postcondition 元の image.data は変更されず、新しいバッファを返す(純粋関数)
 * @throws {RangeError} 事前条件違反
 */
export function removeBackgroundByFloodFill(
  image: RgbaImage,
  tolerance: number,
): BackgroundRemovalResult {
  assertValidImage(image);
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 255) {
    throw new RangeError(`tolerance は 0〜255 が必要です: ${tolerance}`);
  }
  const { width, height } = image;
  const data = new Uint8ClampedArray(image.data);
  const visited = new Uint8Array(width * height);
  const toleranceSq = tolerance * tolerance * 3;
  const cornerIndices = [
    0,
    width - 1,
    (height - 1) * width,
    width * height - 1,
  ];
  let removedPixelCount = 0;
  for (const cornerIndex of cornerIndices) {
    removedPixelCount += floodFillTransparent(
      data,
      width,
      height,
      cornerIndex,
      toleranceSq,
      visited,
    );
  }
  return { data, removedPixelCount };
}

/** 指定起点から 4 方向連結の類似色領域を透過化し、透過した画素数を返す */
function floodFillTransparent(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startIndex: number,
  toleranceSq: number,
  visited: Uint8Array,
): number {
  if (visited[startIndex] === 1) return 0;
  const refR = data[startIndex * 4];
  const refG = data[startIndex * 4 + 1];
  const refB = data[startIndex * 4 + 2];
  const queue = [startIndex];
  visited[startIndex] = 1;
  let removed = 0;
  let head = 0;
  while (head < queue.length) {
    const index = queue[head++];
    const offset = index * 4;
    const dr = data[offset] - refR;
    const dg = data[offset + 1] - refG;
    const db = data[offset + 2] - refB;
    if (dr * dr + dg * dg + db * db > toleranceSq) continue;
    if (data[offset + 3] !== 0) {
      data[offset + 3] = 0;
      removed++;
    }
    const x = index % width;
    const y = (index - x) / width;
    if (x > 0 && visited[index - 1] === 0)
      pushNeighbor(queue, visited, index - 1);
    if (x < width - 1 && visited[index + 1] === 0)
      pushNeighbor(queue, visited, index + 1);
    if (y > 0 && visited[index - width] === 0)
      pushNeighbor(queue, visited, index - width);
    if (y < height - 1 && visited[index + width] === 0)
      pushNeighbor(queue, visited, index + width);
  }
  return removed;
}

function pushNeighbor(
  queue: number[],
  visited: Uint8Array,
  index: number,
): void {
  visited[index] = 1;
  queue.push(index);
}

/**
 * スクリーンショット等の均一色の余白を検出し、コンテンツ領域の矩形を返す。
 * 基準色は左上隅の画素色とする。
 *
 * @precondition image は正当な RGBA 画像、tolerance は 0〜255
 * @postcondition 戻り値の矩形は画像内に収まる。全面が余白色なら null
 * @throws {RangeError} 事前条件違反
 */
export function detectContentRect(
  image: RgbaImage,
  tolerance: number,
): PixelRect | null {
  assertValidImage(image);
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 255) {
    throw new RangeError(`tolerance は 0〜255 が必要です: ${tolerance}`);
  }
  const { width, height } = image;
  const toleranceSq = tolerance * tolerance * 3;
  let top = 0;
  while (top < height && isMarginRow(image, top, toleranceSq)) top++;
  if (top === height) return null;
  let bottom = height - 1;
  while (bottom > top && isMarginRow(image, bottom, toleranceSq)) bottom--;
  let left = 0;
  while (left < width && isMarginColumn(image, left, top, bottom, toleranceSq))
    left++;
  let right = width - 1;
  while (right > left && isMarginColumn(image, right, top, bottom, toleranceSq))
    right--;
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

function isMarginPixel(
  image: RgbaImage,
  index: number,
  toleranceSq: number,
): boolean {
  const { data } = image;
  const dr = data[index * 4] - data[0];
  const dg = data[index * 4 + 1] - data[1];
  const db = data[index * 4 + 2] - data[2];
  return dr * dr + dg * dg + db * db <= toleranceSq;
}

function isMarginRow(
  image: RgbaImage,
  y: number,
  toleranceSq: number,
): boolean {
  for (let x = 0; x < image.width; x++) {
    if (!isMarginPixel(image, y * image.width + x, toleranceSq)) return false;
  }
  return true;
}

function isMarginColumn(
  image: RgbaImage,
  x: number,
  top: number,
  bottom: number,
  toleranceSq: number,
): boolean {
  for (let y = top; y <= bottom; y++) {
    if (!isMarginPixel(image, y * image.width + x, toleranceSq)) return false;
  }
  return true;
}
