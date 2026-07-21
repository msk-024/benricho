import { describe, expect, it } from "vitest";
import {
  appendSuffix,
  baseName,
  dedupeFileNames,
  formatBytes,
  matchesAccept,
  replaceExtension,
} from "./fileName";

describe("replaceExtension", () => {
  it("拡張子を置き換える", () => {
    expect(replaceExtension("photo.jpg", "webp")).toBe("photo.webp");
    expect(replaceExtension("archive.tar.gz", "zip")).toBe("archive.tar.zip");
    expect(replaceExtension("noext", "png")).toBe("noext.png");
    expect(replaceExtension(".gitignore", "txt")).toBe(".gitignore.txt");
  });
});

describe("baseName", () => {
  it("拡張子を除いた基底名を返す", () => {
    expect(baseName("photo.jpg")).toBe("photo");
    expect(baseName("noext")).toBe("noext");
  });
});

describe("appendSuffix", () => {
  it("基底名の末尾にサフィックスを挿入する", () => {
    expect(appendSuffix("photo.jpg", "_noexif")).toBe("photo_noexif.jpg");
    expect(appendSuffix("noext", "_out")).toBe("noext_out");
  });
});

describe("dedupeFileNames", () => {
  it("完全一致する重複にサフィックスを付ける", () => {
    expect(dedupeFileNames(["photo.jpg", "photo.jpg", "photo.jpg"])).toEqual([
      "photo.jpg",
      "photo_2.jpg",
      "photo_3.jpg",
    ]);
  });

  it("大文字小文字違いの重複も区別せず一意化する", () => {
    expect(dedupeFileNames(["photo.jpg", "PHOTO.JPG"])).toEqual([
      "photo.jpg",
      "PHOTO_2.JPG",
    ]);
  });

  it("重複がなければ変更しない", () => {
    expect(dedupeFileNames(["a.png", "b.png"])).toEqual(["a.png", "b.png"]);
  });
});

describe("matchesAccept", () => {
  it("拡張子指定に一致する", () => {
    expect(matchesAccept("data.csv", "text/csv", ".csv,text/csv")).toBe(true);
    expect(matchesAccept("data.txt", "text/plain", ".csv")).toBe(false);
  });

  it("MIMEタイプの完全一致・ワイルドカードに対応する", () => {
    expect(matchesAccept("a.png", "image/png", "image/png,image/jpeg")).toBe(
      true,
    );
    expect(matchesAccept("a.webp", "image/webp", "image/*")).toBe(true);
    expect(matchesAccept("a.pdf", "application/pdf", "image/*")).toBe(false);
  });

  it("acceptが空文字なら常に一致する", () => {
    expect(matchesAccept("a.bin", "application/octet-stream", "")).toBe(true);
  });
});

describe("formatBytes", () => {
  it("単位を切り替えて整形する", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB");
    expect(formatBytes(-1)).toBe("-");
  });
});
