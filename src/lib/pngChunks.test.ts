import { describe, expect, it } from "vitest";
import { stripPngMetadata } from "./pngChunks";
import { readPngSize } from "./pngParse";
import {
  asciiBytes,
  makePngChunk,
  makeSyntheticPng,
} from "./testHelpers/syntheticImages";

describe("stripPngMetadata", () => {
  it("メタデータチャンク(tEXt, eXIf, tIME)を削除し、必須チャンクは保持する", () => {
    const png = makeSyntheticPng(10, 20, [
      makePngChunk("tEXt", asciiBytes("Author\0Mochi")),
      makePngChunk("eXIf", new Uint8Array([1, 2, 3])),
      makePngChunk("tIME", new Uint8Array(7)),
    ]);
    const result = stripPngMetadata(png);
    expect(result.removedChunkTypes).toEqual(["tEXt", "eXIf", "tIME"]);
    expect(readPngSize(result.bytes)).toEqual({ width: 10, height: 20 });
    expect(result.bytes.length).toBeLessThan(png.length);
  });

  it("透過(tRNS)や色管理(gAMA, sRGB)チャンクは保持する", () => {
    const png = makeSyntheticPng(5, 5, [
      makePngChunk("gAMA", new Uint8Array(4)),
      makePngChunk("sRGB", new Uint8Array(1)),
      makePngChunk("tRNS", new Uint8Array(6)),
      makePngChunk("pHYs", new Uint8Array(9)),
    ]);
    const result = stripPngMetadata(png);
    expect(result.removedChunkTypes).toEqual(["pHYs"]);
    // 保持チャンクは順序ごと元のバイト列のまま残る
    expect(result.bytes.length).toBe(png.length - (12 + 9));
  });

  it("APNGのアニメーションチャンク(acTL, fcTL, fdAT)は保持する", () => {
    const png = makeSyntheticPng(4, 4, [
      makePngChunk("acTL", new Uint8Array(8)),
      makePngChunk("fcTL", new Uint8Array(26)),
      makePngChunk("tEXt", asciiBytes("Author\0Mochi")),
      makePngChunk("fdAT", new Uint8Array(10)),
    ]);
    const result = stripPngMetadata(png);
    expect(result.removedChunkTypes).toEqual(["tEXt"]);
  });

  it("メタデータがない PNG は同一バイト列のまま返す", () => {
    const png = makeSyntheticPng(3, 3);
    const result = stripPngMetadata(png);
    expect(result.removedChunkTypes).toEqual([]);
    expect(result.bytes).toEqual(png);
  });

  it("PNG以外・壊れたチャンクでは例外を投げる", () => {
    expect(() => stripPngMetadata(new Uint8Array([1, 2, 3]))).toThrow(
      "PNG形式ではありません",
    );
    const broken = makeSyntheticPng(3, 3).subarray(0, 30);
    expect(() => stripPngMetadata(broken)).toThrow("壊れています");
  });
});
