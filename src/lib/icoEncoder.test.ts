import { describe, expect, it } from "vitest";
import { encodeIco } from "./icoEncoder";

describe("encodeIco", () => {
  it("ICONDIRヘッダーとエントリを正しく構築する", () => {
    const png16 = new Uint8Array([1, 2, 3, 4, 5]);
    const png32 = new Uint8Array([9, 8, 7]);
    const ico = encodeIco([
      { width: 16, height: 16, pngBytes: png16 },
      { width: 32, height: 32, pngBytes: png32 },
    ]);
    const view = new DataView(ico.buffer);
    expect(view.getUint16(0, true)).toBe(0); // 予約領域
    expect(view.getUint16(2, true)).toBe(1); // 種別: アイコン
    expect(view.getUint16(4, true)).toBe(2); // エントリ数

    // エントリ1: 16×16
    expect(ico[6]).toBe(16);
    expect(ico[7]).toBe(16);
    expect(view.getUint32(6 + 8, true)).toBe(png16.length);
    const offset1 = view.getUint32(6 + 12, true);
    expect(offset1).toBe(6 + 16 * 2);
    expect(Array.from(ico.subarray(offset1, offset1 + png16.length))).toEqual([
      1, 2, 3, 4, 5,
    ]);

    // エントリ2: 32×32 はエントリ1の直後に配置される
    const offset2 = view.getUint32(6 + 16 + 12, true);
    expect(offset2).toBe(offset1 + png16.length);
    expect(ico.length).toBe(offset2 + png32.length);
  });

  it("256pxは0として記録する(ICO仕様)", () => {
    const ico = encodeIco([
      { width: 256, height: 256, pngBytes: new Uint8Array([1]) },
    ]);
    expect(ico[6]).toBe(0);
    expect(ico[7]).toBe(0);
  });

  it("事前条件違反で RangeError を投げる", () => {
    expect(() => encodeIco([])).toThrow(RangeError);
    expect(() =>
      encodeIco([{ width: 0, height: 16, pngBytes: new Uint8Array([1]) }]),
    ).toThrow(RangeError);
    expect(() =>
      encodeIco([{ width: 257, height: 16, pngBytes: new Uint8Array([1]) }]),
    ).toThrow(RangeError);
    expect(() =>
      encodeIco([{ width: 16, height: 16, pngBytes: new Uint8Array(0) }]),
    ).toThrow(RangeError);
  });
});
