import { describe, expect, it } from "vitest";
import { concatBytes } from "./bytes";
import { isJpeg, stripJpegMetadata } from "./jpegSegments";
import { asciiBytes, makeJpegSegment } from "./testHelpers/syntheticImages";

const SOI = new Uint8Array([0xff, 0xd8]);
const EOI = new Uint8Array([0xff, 0xd9]);

function makeSyntheticJpeg(middleSegments: readonly Uint8Array[]): Uint8Array {
  const sos = makeJpegSegment(0xda, new Uint8Array([1, 1, 0, 63, 0]));
  const entropyData = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
  return concatBytes([SOI, ...middleSegments, sos, entropyData, EOI]);
}

describe("isJpeg", () => {
  it("SOIマーカーで判定できる", () => {
    expect(
      isJpeg(makeSyntheticJpeg([makeJpegSegment(0xdb, new Uint8Array(64))])),
    ).toBe(true);
    expect(isJpeg(new Uint8Array([0x89, 0x50, 0x4e]))).toBe(false);
  });
});

describe("stripJpegMetadata", () => {
  it("APP1(Exif)とCOMを削除し、DQT等の構造セグメントとSOS以降を無加工で保持する", () => {
    const exif = makeJpegSegment(
      0xe1,
      concatBytes([asciiBytes("Exif\0\0"), new Uint8Array(20)]),
    );
    const comment = makeJpegSegment(0xfe, asciiBytes("shot on camera"));
    const dqt = makeJpegSegment(0xdb, new Uint8Array(65));
    const jpeg = makeSyntheticJpeg([exif, dqt, comment]);
    const result = stripJpegMetadata(jpeg);
    expect(result.removedSegments).toEqual(["APP1(Exif)", "COM(コメント)"]);
    const expected = makeSyntheticJpeg([dqt]);
    expect(result.bytes).toEqual(expected);
  });

  it("JFIF(APP0)・ICCプロファイル(APP2)・Adobe(APP14)は保持する", () => {
    const jfif = makeJpegSegment(
      0xe0,
      concatBytes([asciiBytes("JFIF\0"), new Uint8Array(9)]),
    );
    const icc = makeJpegSegment(
      0xe2,
      concatBytes([asciiBytes("ICC_PROFILE\0"), new Uint8Array(4)]),
    );
    const adobe = makeJpegSegment(
      0xee,
      concatBytes([asciiBytes("Adobe\0"), new Uint8Array(5)]),
    );
    const otherApp2 = makeJpegSegment(
      0xe2,
      concatBytes([asciiBytes("FPXR\0"), new Uint8Array(4)]),
    );
    const jpeg = makeSyntheticJpeg([jfif, icc, adobe, otherApp2]);
    const result = stripJpegMetadata(jpeg);
    expect(result.removedSegments).toEqual(["APP2(FPXR)"]);
    expect(result.bytes).toEqual(makeSyntheticJpeg([jfif, icc, adobe]));
  });

  it("XMP(APP1)を識別して削除する", () => {
    const xmp = makeJpegSegment(
      0xe1,
      concatBytes([
        asciiBytes("http://ns.adobe.com/xap/1.0/\0"),
        new Uint8Array(8),
      ]),
    );
    const result = stripJpegMetadata(makeSyntheticJpeg([xmp]));
    expect(result.removedSegments).toEqual(["APP1(XMP)"]);
  });

  it("マーカー前に0xFFの詰めバイトが連続していても正しく解析する", () => {
    const dqt = makeJpegSegment(0xdb, new Uint8Array(65));
    // 0xFF詰めバイトを1つ挟んだ COM セグメント(仕様上合法)
    const commentWithFill = concatBytes([
      new Uint8Array([0xff]),
      makeJpegSegment(0xfe, asciiBytes("padded")),
    ]);
    const jpeg = concatBytes([
      SOI,
      dqt,
      commentWithFill,
      makeJpegSegment(0xda, new Uint8Array([1, 1, 0, 63, 0])),
      new Uint8Array([0x12, 0x34, 0x56, 0x78]),
      EOI,
    ]);
    const result = stripJpegMetadata(jpeg);
    expect(result.removedSegments).toEqual(["COM(コメント)"]);
    expect(result.bytes).toEqual(makeSyntheticJpeg([dqt]));
  });

  it("JPEG以外・壊れたセグメントでは例外を投げる", () => {
    expect(() => stripJpegMetadata(new Uint8Array([1, 2, 3]))).toThrow(
      "JPEG形式ではありません",
    );
    const truncated = makeSyntheticJpeg([]).subarray(0, 4);
    expect(() => stripJpegMetadata(truncated)).toThrow();
  });
});
