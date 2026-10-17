import type { PixelRect, RgbaImage } from "./imageOps";

/**
 * {@link analyzeStampSheet} が返す検出グループ(regions)ごとに、与えられた枠(frames)の
 * うちどれに最も多く画素が含まれるかを求め、そのグループの持ち主の枠インデックスを返す。
 * 枠は検出グループと1:1とは限らない(手動で移動/リサイズ/結合/削除された後の実際の
 * 書き出し枠)ため、画素の重なりで対応付ける。
 *
 * グループの画素は必ず regions[i] のbbox内に収まるため、bbox内だけをスキャンすれば
 * 十分(シート全体を毎回走査しない)。
 *
 * @precondition ownerMap は sheetWidth × (ownerMap.length / sheetWidth) 画素分の長さ
 * @postcondition 戻り値の長さは regions.length。対応する枠がなければ -1
 */
export function assignGroupsToFrames(
  ownerMap: Int32Array,
  regions: readonly PixelRect[],
  sheetWidth: number,
  frames: readonly PixelRect[],
): number[] {
  return regions.map((regionBounds, regionIndex) => {
    const candidates = frames
      .map((frame, frameIndex) => ({ frame, frameIndex }))
      .filter(({ frame }) => rectsIntersect(frame, regionBounds));
    if (candidates.length === 0) return -1;

    const tally = new Array<number>(candidates.length).fill(0);
    for (
      let y = regionBounds.y;
      y < regionBounds.y + regionBounds.height;
      y++
    ) {
      for (
        let x = regionBounds.x;
        x < regionBounds.x + regionBounds.width;
        x++
      ) {
        if (ownerMap[y * sheetWidth + x] !== regionIndex) continue;
        candidates.forEach(({ frame }, candidateIndex) => {
          if (pointInRect(x, y, frame)) tally[candidateIndex]++;
        });
      }
    }

    let bestCandidateIndex = 0;
    for (let i = 1; i < tally.length; i++) {
      if (tally[i] > tally[bestCandidateIndex]) bestCandidateIndex = i;
    }
    if (tally[bestCandidateIndex] === 0) return -1;
    return candidates[bestCandidateIndex].frameIndex;
  });
}

/**
 * frame(切り出し矩形)に対応するシート上の画素データのうち、「別の枠が持ち主」の
 * 検出グループに属する画素だけをアルファ0にして返す(お隣のイラストの写り込み除去)。
 * どのグループにも属さない画素(ノイズ・背景)はそのまま残す。
 *
 * @precondition croppedImage の width/height は frame の width/height と一致する
 * @postcondition 戻り値は croppedImage と同じ長さの新しいバッファ(純粋関数、入力は変更しない)
 * @throws {RangeError} croppedImage のサイズが frame と一致しない場合
 */
export function isolateFrameOwnership(
  croppedImage: RgbaImage,
  frame: PixelRect,
  frameIndex: number,
  sheetWidth: number,
  ownerMap: Int32Array,
  groupOwnerFrameIndex: readonly number[],
): Uint8ClampedArray<ArrayBuffer> {
  if (
    croppedImage.width !== frame.width ||
    croppedImage.height !== frame.height
  ) {
    throw new RangeError(
      `croppedImage(${croppedImage.width}×${croppedImage.height})のサイズが frame(${frame.width}×${frame.height})と一致しません`,
    );
  }
  // ArrayBuffer固定なのは new ImageData() の引数型(ImageDataArray)に合わせるため
  const data: Uint8ClampedArray<ArrayBuffer> = new Uint8ClampedArray(
    croppedImage.data.length,
  );
  data.set(croppedImage.data);
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const sheetPixelIndex = (frame.y + y) * sheetWidth + (frame.x + x);
      const group = ownerMap[sheetPixelIndex];
      if (group === -1) continue; // どのグループにも属さない画素はそのまま残す
      const ownerFrameIndex = groupOwnerFrameIndex[group];
      if (ownerFrameIndex === -1 || ownerFrameIndex === frameIndex) continue;
      const croppedIndex = (y * croppedImage.width + x) * 4;
      data[croppedIndex + 3] = 0;
    }
  }
  return data;
}

function rectsIntersect(a: PixelRect, b: PixelRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function pointInRect(x: number, y: number, rect: PixelRect): boolean {
  return (
    x >= rect.x &&
    x < rect.x + rect.width &&
    y >= rect.y &&
    y < rect.y + rect.height
  );
}
