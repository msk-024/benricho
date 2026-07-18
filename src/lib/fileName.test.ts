import { describe, expect, it } from "vitest";
import {
  appendSuffix,
  baseName,
  formatBytes,
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

describe("formatBytes", () => {
  it("単位を切り替えて整形する", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB");
    expect(formatBytes(-1)).toBe("-");
  });
});
