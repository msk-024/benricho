import { describe, expect, it } from "vitest";
import { decodeTextWithEncodingFallback } from "./textDecode";

describe("decodeTextWithEncodingFallback", () => {
  it("正当なUTF-8はそのまま復号する", () => {
    const bytes = new TextEncoder().encode("こんにちは");
    expect(decodeTextWithEncodingFallback(bytes)).toBe("こんにちは");
  });

  it("Shift_JISバイト列はUTF-8で文字化けするためフォールバックする", () => {
    // "あ" の Shift_JIS 表現(0x82 0xA0)は単独では不正なUTF-8シーケンス
    const bytes = new Uint8Array([0x82, 0xa0, 0x82, 0xa2]);
    expect(decodeTextWithEncodingFallback(bytes)).toBe("あい");
  });

  it("空バイト列は空文字を返す", () => {
    expect(decodeTextWithEncodingFallback(new Uint8Array(0))).toBe("");
  });
});
