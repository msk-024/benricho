import { forEachJpegSegment, isJpeg } from "./jpegSegments";

/**
 * JPEGのExif(APP1)からOrientationタグ(0x0112)の値を読み取る。
 * Exifが無い、Orientationタグが無い、または構造が想定外の場合は 1(回転なし)を返す。
 *
 * ブラウザは HTMLImageElement のデコード時にこのタグを見て自動的に正しい向きで
 * 描画する(`image-orientation: from-image` が既定)。そのため、このモジュールは
 * 「再エンコードして焼き込みが必要かどうか」の判定にのみ使う。回転処理そのものは
 * 行わない(自前で回転させるとブラウザの自動回転と二重にかかってしまう)。
 *
 * @precondition bytes は正当なJPEG
 * @postcondition 戻り値は 1〜8 の整数
 * @throws {Error} JPEG形式でない場合
 */
export function readJpegOrientation(bytes: Uint8Array): number {
  if (!isJpeg(bytes)) throw new Error("JPEG形式ではありません");
  const tiff = findExifTiffData(bytes);
  if (tiff === null) return 1;
  return parseOrientationFromTiff(tiff) ?? 1;
}

/**
 * APP1(Exif)セグメントの "Exif\0\0" 直後(TIFFヘッダ開始位置)からのデータを返す。
 * セグメント構造が壊れている場合も例外にせず null を返す(呼び出し側で1=回転なし扱いにする)
 */
function findExifTiffData(bytes: Uint8Array): Uint8Array | null {
  let result: Uint8Array | null = null;
  try {
    forEachJpegSegment(bytes, ({ marker, dataStart, end }) => {
      if (marker !== 0xe1 || !isExifIdentifier(bytes, dataStart, end)) {
        return;
      }
      result = bytes.subarray(dataStart + 6, end);
      return true; // 見つかったので走査を打ち切る
    });
  } catch {
    return null;
  }
  return result;
}

function isExifIdentifier(
  bytes: Uint8Array,
  dataStart: number,
  segmentEnd: number,
): boolean {
  if (dataStart + 6 > segmentEnd) return false;
  // "Exif\0\0"
  return (
    bytes[dataStart] === 0x45 &&
    bytes[dataStart + 1] === 0x78 &&
    bytes[dataStart + 2] === 0x69 &&
    bytes[dataStart + 3] === 0x66 &&
    bytes[dataStart + 4] === 0x00 &&
    bytes[dataStart + 5] === 0x00
  );
}

/** TIFFヘッダ + IFD0 から Orientation タグ(0x0112, SHORT)の値を読む */
function parseOrientationFromTiff(tiff: Uint8Array): number | null {
  if (tiff.length < 8) return null;
  const isLittleEndian = tiff[0] === 0x49 && tiff[1] === 0x49; // "II"
  const isBigEndian = tiff[0] === 0x4d && tiff[1] === 0x4d; // "MM"
  if (!isLittleEndian && !isBigEndian) return null;
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const read16 = (offset: number): number =>
    view.getUint16(offset, isLittleEndian);
  const read32 = (offset: number): number =>
    view.getUint32(offset, isLittleEndian);

  if (read16(2) !== 0x002a) return null; // TIFFマジックナンバー
  const ifd0Offset = read32(4);
  if (ifd0Offset + 2 > tiff.length) return null;
  const entryCount = read16(ifd0Offset);
  for (let i = 0; i < entryCount; i++) {
    const entryOffset = ifd0Offset + 2 + i * 12;
    if (entryOffset + 12 > tiff.length) break;
    const tag = read16(entryOffset);
    if (tag !== 0x0112) continue;
    const valueType = read16(entryOffset + 2);
    if (valueType !== 3) return null; // OrientationはSHORT型のはず
    const value = read16(entryOffset + 8);
    return value >= 1 && value <= 8 ? value : null;
  }
  return null;
}
