import { concatBytes } from "../bytes";

/** テスト用の PNG チャンクを組み立てる(CRC は検証対象外のためゼロ埋め) */
export function makePngChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
  chunk.set(data, 8);
  return chunk;
}

export const PNG_SIGNATURE_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/** テスト用の構造的に正しい PNG バイト列を生成する */
export function makeSyntheticPng(
  width: number,
  height: number,
  extraChunks: readonly Uint8Array[] = [],
): Uint8Array {
  const ihdrData = new Uint8Array(13);
  const view = new DataView(ihdrData.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdrData[8] = 8; // ビット深度
  ihdrData[9] = 6; // カラータイプ: RGBA
  return concatBytes([
    PNG_SIGNATURE_BYTES,
    makePngChunk("IHDR", ihdrData),
    ...extraChunks,
    makePngChunk("IDAT", new Uint8Array([1, 2, 3, 4])),
    makePngChunk("IEND", new Uint8Array(0)),
  ]);
}

/** テスト用の JPEG セグメント(マーカー + 長さ + データ)を組み立てる */
export function makeJpegSegment(marker: number, data: Uint8Array): Uint8Array {
  const segment = new Uint8Array(4 + data.length);
  segment[0] = 0xff;
  segment[1] = marker;
  const length = data.length + 2;
  segment[2] = (length >> 8) & 0xff;
  segment[3] = length & 0xff;
  segment.set(data, 4);
  return segment;
}

export function asciiBytes(text: string): Uint8Array {
  return new Uint8Array([...text].map((char) => char.charCodeAt(0)));
}
