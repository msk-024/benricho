import { describe, expect, it } from "vitest";
import { buildStampFileName } from "./stampNaming";

describe("buildStampFileName", () => {
  it("ゼロ埋め2桁の規則的ファイル名を生成する", () => {
    expect(buildStampFileName(1, "main")).toBe("01_main.png");
    expect(buildStampFileName(1, "tab")).toBe("01_tab.png");
    expect(buildStampFileName(1, "sticker")).toBe("01_sticker.png");
    expect(buildStampFileName(12, "sticker")).toBe("12_sticker.png");
    expect(buildStampFileName(40, "sticker")).toBe("40_sticker.png");
  });

  it("範囲外の index で RangeError を投げる", () => {
    expect(() => buildStampFileName(0, "main")).toThrow(RangeError);
    expect(() => buildStampFileName(100, "main")).toThrow(RangeError);
    expect(() => buildStampFileName(1.5, "main")).toThrow(RangeError);
  });
});
