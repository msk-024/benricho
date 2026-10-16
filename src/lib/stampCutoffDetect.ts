import { assertValidImage, type PixelRect, type RgbaImage } from "./imageOps";

export interface CutoffEdges {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

export interface DetectContentCutoffOptions {
  /** この値を超えるアルファ値の画素を「絵」として扱う */
  alphaThreshold?: number;
  /** frame の外側を確認する帯の幅(px) */
  bandPx?: number;
}

const DEFAULT_ALPHA_THRESHOLD = 10;
const DEFAULT_BAND_PX = 3;

/**
 * frame の外側(=このスタンプとして書き出さない領域)に絵の画素が続いているかを辺ごとに判定する。
 *
 * 自動検出されたframe(タイトな外接矩形)は定義上必ず境界線上で画素に接するため、
 * 「境界線上に画素があるか」をそのまま切れ検出に使うと常に真になり警告として機能しない。
 * そこで frame の"外側"の帯を見て、絵がフレームを越えて続いているかどうかだけを判定する。
 * 外側が画像の真の端で存在しない場合(frameが画像全体と一致するLineStampToolのケースを含む)は、
 * frame内側の境界行/列(確認できる限界)にフォールバックする。
 *
 * @precondition image は正当なRGBA画像、frame は image 内に収まる正の矩形
 * @precondition alphaThreshold は 0〜255、bandPx は 1 以上の整数
 * @throws {RangeError} 事前条件違反
 */
export function detectContentCutoff(
  image: RgbaImage,
  frame: PixelRect,
  options: DetectContentCutoffOptions = {},
): CutoffEdges {
  assertValidImage(image);
  const alphaThreshold = options.alphaThreshold ?? DEFAULT_ALPHA_THRESHOLD;
  const bandPx = options.bandPx ?? DEFAULT_BAND_PX;
  if (
    !Number.isFinite(alphaThreshold) ||
    alphaThreshold < 0 ||
    alphaThreshold > 255
  ) {
    throw new RangeError(
      `alphaThreshold は 0〜255 が必要です: ${alphaThreshold}`,
    );
  }
  if (!Number.isInteger(bandPx) || bandPx < 1) {
    throw new RangeError(`bandPx は 1 以上の整数が必要です: ${bandPx}`);
  }

  const left = Math.round(frame.x);
  const top = Math.round(frame.y);
  const right = left + Math.round(frame.width);
  const bottom = top + Math.round(frame.height);
  if (
    left < 0 ||
    top < 0 ||
    right > image.width ||
    bottom > image.height ||
    right <= left ||
    bottom <= top
  ) {
    throw new RangeError(
      `frame は image 内に収まる正の矩形が必要です: ${JSON.stringify(frame)}`,
    );
  }

  return {
    top: checkTop(image, left, right, top, bandPx, alphaThreshold),
    bottom: checkBottom(image, left, right, bottom, bandPx, alphaThreshold),
    left: checkLeft(image, top, bottom, left, bandPx, alphaThreshold),
    right: checkRight(image, top, bottom, right, bandPx, alphaThreshold),
  };
}

/** 4辺のいずれかが切れていそうなら true */
export function hasAnyCutoff(edges: CutoffEdges): boolean {
  return edges.top || edges.bottom || edges.left || edges.right;
}

function checkTop(
  image: RgbaImage,
  left: number,
  right: number,
  top: number,
  bandPx: number,
  alphaThreshold: number,
): boolean {
  const outsideStart = Math.max(0, top - bandPx);
  if (outsideStart < top) {
    return hasOpaqueInRect(
      image,
      outsideStart,
      top,
      left,
      right,
      alphaThreshold,
    );
  }
  return hasOpaqueInRect(
    image,
    top,
    Math.min(image.height, top + 1),
    left,
    right,
    alphaThreshold,
  );
}

function checkBottom(
  image: RgbaImage,
  left: number,
  right: number,
  bottom: number,
  bandPx: number,
  alphaThreshold: number,
): boolean {
  const outsideEnd = Math.min(image.height, bottom + bandPx);
  if (outsideEnd > bottom) {
    return hasOpaqueInRect(
      image,
      bottom,
      outsideEnd,
      left,
      right,
      alphaThreshold,
    );
  }
  return hasOpaqueInRect(
    image,
    Math.max(0, bottom - 1),
    bottom,
    left,
    right,
    alphaThreshold,
  );
}

function checkLeft(
  image: RgbaImage,
  top: number,
  bottom: number,
  left: number,
  bandPx: number,
  alphaThreshold: number,
): boolean {
  const outsideStart = Math.max(0, left - bandPx);
  if (outsideStart < left) {
    return hasOpaqueInRect(
      image,
      top,
      bottom,
      outsideStart,
      left,
      alphaThreshold,
    );
  }
  return hasOpaqueInRect(
    image,
    top,
    bottom,
    left,
    Math.min(image.width, left + 1),
    alphaThreshold,
  );
}

function checkRight(
  image: RgbaImage,
  top: number,
  bottom: number,
  right: number,
  bandPx: number,
  alphaThreshold: number,
): boolean {
  const outsideEnd = Math.min(image.width, right + bandPx);
  if (outsideEnd > right) {
    return hasOpaqueInRect(
      image,
      top,
      bottom,
      right,
      outsideEnd,
      alphaThreshold,
    );
  }
  return hasOpaqueInRect(
    image,
    top,
    bottom,
    Math.max(0, right - 1),
    right,
    alphaThreshold,
  );
}

function hasOpaqueInRect(
  image: RgbaImage,
  yStart: number,
  yEnd: number,
  xStart: number,
  xEnd: number,
  alphaThreshold: number,
): boolean {
  const { width, data } = image;
  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      if (data[(y * width + x) * 4 + 3] > alphaThreshold) return true;
    }
  }
  return false;
}
