import { concatBytes } from "./bytes";

export interface JpegStripResult {
  bytes: Uint8Array;
  removedSegments: string[];
}

export interface JpegSegmentInfo {
  marker: number;
  /** セグメント全体(0xFFマーカー含む、先行する詰めバイトも含む)の開始位置 */
  start: number;
  /** セグメントデータの開始位置(マーカー+長さフィールドの直後)。長さフィールドを持たないマーカー(RST/TEM/EOI)では意味を持たない */
  dataStart: number;
  /** セグメント全体の終了位置(次セグメントの開始位置と同じ、排他的)。SOS(0xDA)では bytes.length になる */
  end: number;
}

/**
 * バイト列が JPEG(SOI マーカー)で始まるか判定する。
 *
 * @postcondition 真偽値を返すのみで副作用はない
 */
export function isJpeg(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}

/**
 * JPEGの各セグメントを順に onSegment へ渡す(マーカー構造解析の共通部)。
 * SOS(0xDA)に到達すると、残り全体(エントロピー符号化データ含む)を最後に1回
 * 通知して終了する。onSegment が true を返すとその時点で走査を打ち切る。
 *
 * @precondition bytes は正当な JPEG(isJpeg で判定済み)
 * @throws {Error} セグメント構造が壊れている場合
 */
export function forEachJpegSegment(
  bytes: Uint8Array,
  onSegment: (segment: JpegSegmentInfo) => boolean | void,
): void {
  let offset = 2;
  while (offset + 2 <= bytes.length) {
    if (bytes[offset] !== 0xff)
      throw new Error("JPEGのセグメント構造が壊れています");
    // JPEG仕様上、マーカー前には 0xFF の詰めバイトが連続することがあるため読み飛ばす
    let markerOffset = offset + 1;
    while (markerOffset < bytes.length && bytes[markerOffset] === 0xff) {
      markerOffset++;
    }
    if (markerOffset >= bytes.length)
      throw new Error("JPEGのセグメント構造が壊れています");
    const marker = bytes[markerOffset];
    if (
      marker === 0xd9 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      const shouldStop = onSegment({
        marker,
        start: offset,
        dataStart: markerOffset + 1,
        end: markerOffset + 1,
      });
      offset = markerOffset + 1;
      if (shouldStop === true) return;
      continue;
    }
    if (markerOffset + 3 > bytes.length)
      throw new Error("JPEGのセグメント構造が壊れています");
    const segmentLength =
      (bytes[markerOffset + 1] << 8) | bytes[markerOffset + 2];
    const segmentEnd = markerOffset + 1 + segmentLength;
    if (segmentLength < 2 || segmentEnd > bytes.length) {
      throw new Error("JPEGのセグメント長が不正です");
    }
    if (marker === 0xda) {
      // SOS 以降はエントロピー符号化データ。末尾まで無加工で1セグメント扱いにする
      onSegment({
        marker,
        start: offset,
        dataStart: markerOffset + 3,
        end: bytes.length,
      });
      return;
    }
    const shouldStop = onSegment({
      marker,
      start: offset,
      dataStart: markerOffset + 3,
      end: segmentEnd,
    });
    offset = segmentEnd;
    if (shouldStop === true) return;
  }
}

/**
 * JPEG から EXIF 等のメタデータセグメントをロスレスに除去する。
 * 画像本体(SOS 以降)は無変更のため再エンコードによる画質劣化は発生しない。
 *
 * 保持: APP0(JFIF), APP2(ICCプロファイル), APP14(Adobe色変換情報), 画像構造セグメント
 * 削除: APP1(Exif/XMP), その他の APPn, COM(コメント)
 *
 * @precondition bytes は正当な JPEG
 * @postcondition 戻り値の bytes はデコード可能な正当な JPEG
 * @throws {Error} JPEG でない、またはセグメント構造が壊れている場合
 */
export function stripJpegMetadata(bytes: Uint8Array): JpegStripResult {
  if (!isJpeg(bytes)) throw new Error("JPEG形式ではありません");
  const keptParts: Uint8Array[] = [bytes.subarray(0, 2)];
  const removedSegments: string[] = [];
  forEachJpegSegment(bytes, ({ marker, start, dataStart, end }) => {
    if (
      marker === 0xd9 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7) ||
      marker === 0xda
    ) {
      keptParts.push(bytes.subarray(start, end));
      return;
    }
    // shouldKeepSegment/describeSegment は「0xFF直後がマーカー」を前提に
    // segmentStart+4 をデータ開始位置として読むため、dataStart(マーカー+長さ
    // フィールドの直後)から4バイト分戻した仮想オフセットを渡して再利用する
    const segmentStart = dataStart - 4;
    if (shouldKeepSegment(marker, bytes, segmentStart)) {
      keptParts.push(bytes.subarray(start, end));
    } else {
      removedSegments.push(describeSegment(marker, bytes, segmentStart));
    }
  });
  return { bytes: concatBytes(keptParts), removedSegments };
}

function shouldKeepSegment(
  marker: number,
  bytes: Uint8Array,
  segmentStart: number,
): boolean {
  if (marker === 0xfe) return false; // COM
  if (marker < 0xe0 || marker > 0xef) return true; // APPn 以外の構造セグメントは保持
  if (marker === 0xe0) return true; // APP0: JFIF
  const identifier = readSegmentIdentifier(bytes, segmentStart);
  if (marker === 0xe2 && identifier === "ICC_PROFILE") return true;
  if (marker === 0xee && identifier === "Adobe") return true;
  return false;
}

function describeSegment(
  marker: number,
  bytes: Uint8Array,
  segmentStart: number,
): string {
  if (marker === 0xfe) return "COM(コメント)";
  const appIndex = marker - 0xe0;
  const identifier = readSegmentIdentifier(bytes, segmentStart);
  if (marker === 0xe1) {
    if (identifier === "Exif") return "APP1(Exif)";
    if (identifier.startsWith("http://ns.adobe.com/xap")) return "APP1(XMP)";
  }
  return identifier === "" ? `APP${appIndex}` : `APP${appIndex}(${identifier})`;
}

/** APPn セグメント先頭の NULL 終端 ASCII 識別子を読み取る(最大 32 バイト) */
function readSegmentIdentifier(
  bytes: Uint8Array,
  segmentStart: number,
): string {
  const dataStart = segmentStart + 4;
  let identifier = "";
  for (let i = dataStart; i < Math.min(dataStart + 32, bytes.length); i++) {
    const byte = bytes[i];
    if (byte === 0x00) break;
    if (byte < 0x20 || byte > 0x7e) return "";
    identifier += String.fromCharCode(byte);
  }
  return identifier;
}
