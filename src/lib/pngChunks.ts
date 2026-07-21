import { concatBytes } from "./bytes";
import { isPng } from "./pngParse";

/**
 * 画質・透過・色再現・アニメーションに影響するため保持するチャンク。
 * acTL/fcTL/fdAT は APNG のアニメーション定義・フレームデータで、
 * 除去すると静止画に劣化してしまうため削除対象から除外する。
 * それ以外(メタデータ)は削除対象
 */
const KEEP_CHUNK_TYPES = new Set([
  "IHDR",
  "PLTE",
  "tRNS",
  "sRGB",
  "gAMA",
  "cHRM",
  "iCCP",
  "IDAT",
  "acTL",
  "fcTL",
  "fdAT",
  "IEND",
]);

export interface PngStripResult {
  bytes: Uint8Array;
  removedChunkTypes: string[];
}

/**
 * PNG からメタデータ系チャンク(eXIf, tEXt, tIME, pHYs 等)をロスレスに除去する。
 * 画素データ(IDAT)には手を付けないため、再圧縮による画質劣化は発生しない。
 *
 * @precondition bytes は正当な PNG
 * @postcondition 戻り値の bytes は IHDR / IDAT / IEND を保持した正当な PNG
 * @postcondition removedChunkTypes には削除したチャンク名が出現順に入る
 * @throws {Error} PNG でない、またはチャンク構造が壊れている場合
 */
export function stripPngMetadata(bytes: Uint8Array): PngStripResult {
  if (!isPng(bytes)) throw new Error("PNG形式ではありません");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const keptParts: Uint8Array[] = [bytes.subarray(0, 8)];
  const removedChunkTypes: string[] = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const dataLength = view.getUint32(offset);
    const chunkEnd = offset + 12 + dataLength;
    if (chunkEnd > bytes.length)
      throw new Error("PNGのチャンク構造が壊れています");
    const chunkType = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );
    if (KEEP_CHUNK_TYPES.has(chunkType)) {
      keptParts.push(bytes.subarray(offset, chunkEnd));
    } else {
      removedChunkTypes.push(chunkType);
    }
    offset = chunkEnd;
    if (chunkType === "IEND") break;
  }
  return { bytes: concatBytes(keptParts), removedChunkTypes };
}
