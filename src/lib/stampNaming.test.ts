import { describe, expect, it } from "vitest";
import { buildStampFileName, isMainOrTabFile } from "./stampNaming";

describe("buildStampFileName", () => {
  it("main/tabは番号なしの固定ファイル名を生成する", () => {
    expect(buildStampFileName(1, "main")).toBe("main.png");
    expect(buildStampFileName(1, "tab")).toBe("tab.png");
    expect(buildStampFileName(5, "main")).toBe("main.png");
    expect(buildStampFileName(5, "tab")).toBe("tab.png");
  });

  it("stickerはゼロ埋め2桁の番号ファイル名を生成する", () => {
    expect(buildStampFileName(1, "sticker")).toBe("01.png");
    expect(buildStampFileName(12, "sticker")).toBe("12.png");
    expect(buildStampFileName(40, "sticker")).toBe("40.png");
  });

  it("範囲外の index で RangeError を投げる", () => {
    expect(() => buildStampFileName(0, "main")).toThrow(RangeError);
    expect(() => buildStampFileName(100, "main")).toThrow(RangeError);
    expect(() => buildStampFileName(1.5, "main")).toThrow(RangeError);
  });
});

describe("isMainOrTabFile", () => {
  it("main/tabファイルを判定する", () => {
    expect(isMainOrTabFile("main.png")).toBe(true);
    expect(isMainOrTabFile("tab.png")).toBe(true);
  });

  it("stickerファイルはfalse", () => {
    expect(isMainOrTabFile("01.png")).toBe(false);
  });
});
