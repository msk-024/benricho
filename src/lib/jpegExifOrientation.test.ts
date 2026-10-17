import { describe, expect, it } from "vitest";
import { concatBytes } from "./bytes";
import { readJpegOrientation } from "./jpegExifOrientation";
import { asciiBytes, makeJpegSegment } from "./testHelpers/syntheticImages";

const SOI = new Uint8Array([0xff, 0xd8]);
const EOI = new Uint8Array([0xff, 0xd9]);

/** Orientation(0x0112, SHORT)タグ1件だけを持つ最小のTIFF(IFD0)データを組み立てる */
function makeTiffWithOrientation(
  orientation: number,
  littleEndian = true,
): Uint8Array {
  const byteOrder = littleEndian
    ? [0x49, 0x49] // "II"
    : [0x4d, 0x4d]; // "MM"
  const u16 = (value: number): number[] =>
    littleEndian
      ? [value & 0xff, (value >> 8) & 0xff]
      : [(value >> 8) & 0xff, value & 0xff];
  const u32 = (value: number): number[] =>
    littleEndian
      ? [
          value & 0xff,
          (value >> 8) & 0xff,
          (value >> 16) & 0xff,
          (value >> 24) & 0xff,
        ]
      : [
          (value >> 24) & 0xff,
          (value >> 16) & 0xff,
          (value >> 8) & 0xff,
          value & 0xff,
        ];
  return new Uint8Array([
    ...byteOrder,
    ...u16(0x002a), // マジックナンバー
    ...u32(8), // IFD0オフセット
    ...u16(1), // entry count = 1
    ...u16(0x0112), // tag: Orientation
    ...u16(3), // type: SHORT
    ...u32(1), // count
    ...u16(orientation), // 値(SHORTは先頭2バイト)
    0x00,
    0x00, // パディング
    ...u32(0), // 次のIFDなし
  ]);
}

/** TIFFデータ(またはnull=Exifなし)を持つ合成JPEGを組み立てる */
function makeJpegWithTiff(tiff: Uint8Array | null): Uint8Array {
  const sos = makeJpegSegment(0xda, new Uint8Array([1, 1, 0, 63, 0]));
  const entropyData = new Uint8Array([0x12, 0x34]);
  if (tiff === null) {
    return concatBytes([SOI, sos, entropyData, EOI]);
  }
  const exifSegment = makeJpegSegment(
    0xe1,
    concatBytes([asciiBytes("Exif\0\0"), tiff]),
  );
  return concatBytes([SOI, exifSegment, sos, entropyData, EOI]);
}

describe("readJpegOrientation", () => {
  it("Orientation=6(リトルエンディアン)を読み取る", () => {
    const jpeg = makeJpegWithTiff(makeTiffWithOrientation(6, true));
    expect(readJpegOrientation(jpeg)).toBe(6);
  });

  it("Orientation=8(ビッグエンディアン/MM)を読み取る", () => {
    const jpeg = makeJpegWithTiff(makeTiffWithOrientation(8, false));
    expect(readJpegOrientation(jpeg)).toBe(8);
  });

  it("Orientation=3を読み取る", () => {
    const jpeg = makeJpegWithTiff(makeTiffWithOrientation(3, true));
    expect(readJpegOrientation(jpeg)).toBe(3);
  });

  it("Orientation=1(回転なし)も正しく読み取る", () => {
    const jpeg = makeJpegWithTiff(makeTiffWithOrientation(1, true));
    expect(readJpegOrientation(jpeg)).toBe(1);
  });

  it("Exifが無いJPEGは1を返す", () => {
    expect(readJpegOrientation(makeJpegWithTiff(null))).toBe(1);
  });

  it("ExifはあるがOrientationタグが無い場合は1を返す(他のタグのみのIFD0)", () => {
    // tag=0x0100(ImageWidth)だけを持つIFD0
    const tiff = new Uint8Array([
      0x49,
      0x49,
      0x2a,
      0x00,
      0x08,
      0x00,
      0x00,
      0x00,
      0x01,
      0x00, // entry count = 1
      0x00,
      0x01, // tag: 0x0100 (ImageWidth)
      0x03,
      0x00,
      0x01,
      0x00,
      0x00,
      0x00,
      0x64,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
    ]);
    expect(readJpegOrientation(makeJpegWithTiff(tiff))).toBe(1);
  });

  it("壊れた/短すぎるTIFFデータでも例外を投げず1を返す", () => {
    expect(
      readJpegOrientation(makeJpegWithTiff(new Uint8Array([0x49, 0x49]))),
    ).toBe(1);
  });

  it("JPEG形式でなければ例外を投げる", () => {
    expect(() => readJpegOrientation(new Uint8Array([1, 2, 3]))).toThrow(
      "JPEG形式ではありません",
    );
  });
});
