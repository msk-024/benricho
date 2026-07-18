import { describe, expect, it } from "vitest";
import {
  asciiToFullWidth,
  asciiToHalfWidth,
  countText,
  kanaToFullWidth,
  kanaToHalfWidth,
  normalizeText,
} from "./textNormalize";

describe("countText", () => {
  it("コードポイント数・空白除外数・全角半角内訳・行数・バイト数を数える", () => {
    // あ, a, 1, 半角スペース, Ａ, 改行, 𩸽(サロゲートペア) の 7 コードポイント
    const result = countText("あa1 Ａ\n𩸽");
    expect(result.totalChars).toBe(7);
    expect(result.charsWithoutWhitespace).toBe(5);
    expect(result.fullWidthChars).toBe(3); // あ, Ａ, 𩸽
    expect(result.halfWidthChars).toBe(4);
    expect(result.lineCount).toBe(2);
    expect(result.utf8Bytes).toBe(3 + 1 + 1 + 1 + 3 + 1 + 4);
  });

  it("空文字は全カウント0を返す", () => {
    expect(countText("")).toEqual({
      totalChars: 0,
      charsWithoutWhitespace: 0,
      fullWidthChars: 0,
      halfWidthChars: 0,
      lineCount: 0,
      utf8Bytes: 0,
    });
  });
});

describe("全角半角変換", () => {
  it("全角英数字・記号を半角にする", () => {
    expect(asciiToHalfWidth("ＡＢＣ１２３！？（）")).toBe("ABC123!?()");
  });

  it("半角英数字・記号を全角にする(半角スペースは対象外)", () => {
    expect(asciiToFullWidth("abc 123!")).toBe("ａｂｃ １２３！");
  });

  it("半角カタカナを全角にする(濁点・半濁点を合成する)", () => {
    expect(kanaToFullWidth("ｶﾞｷﾞｭｳ ﾊﾟｰﾃｨｰ ｱｲｳｦﾝ｡｢｣")).toBe(
      "ガギュウ パーティー アイウヲン。「」",
    );
    expect(kanaToFullWidth("ｳﾞ")).toBe("ヴ");
  });

  it("全角カタカナを半角にする(濁音は2文字に分解する)", () => {
    expect(kanaToHalfWidth("ガギュウ パーティー")).toBe("ｶﾞｷﾞｭｳ ﾊﾟｰﾃｨｰ");
    expect(kanaToHalfWidth("ヴ")).toBe("ｳﾞ");
  });

  it("ひらがな・漢字は変換対象外", () => {
    expect(kanaToHalfWidth("あいう漢字")).toBe("あいう漢字");
    expect(kanaToFullWidth("あいう漢字")).toBe("あいう漢字");
  });
});

describe("normalizeText", () => {
  it("系統ごとの指定を組み合わせて適用する", () => {
    const result = normalizeText("Ｈｅｌｌｏ　ｾｶｲ！", {
      ascii: "toHalf",
      kana: "toFull",
      space: "toHalf",
    });
    expect(result).toBe("Hello セカイ!");
  });

  it("keep 指定の系統は変更しない", () => {
    const original = "Ａb ｱイ　ウ";
    expect(
      normalizeText(original, { ascii: "keep", kana: "keep", space: "keep" }),
    ).toBe(original);
  });

  it("全角化の組み合わせも動作する", () => {
    const result = normalizeText("abc ｶﾞ", {
      ascii: "toFull",
      kana: "toFull",
      space: "toFull",
    });
    expect(result).toBe("ａｂｃ　ガ");
  });
});
