import { describe, expect, it } from "vitest";
import {
  pageItemsToText,
  pagesToMarkdown,
  type PdfTextItem,
} from "./pdfToMarkdown";

describe("pageItemsToText", () => {
  it("hasEOLの項目の後ろで改行する", () => {
    const items: PdfTextItem[] = [
      { str: "Hello World", hasEOL: true },
      { str: "Second line", hasEOL: false },
    ];
    expect(pageItemsToText(items)).toBe("Hello World\nSecond line");
  });

  it("同じ行内の複数項目をつなげる", () => {
    const items: PdfTextItem[] = [
      { str: "foo", hasEOL: false },
      { str: "bar", hasEOL: true },
    ];
    expect(pageItemsToText(items)).toBe("foo bar");
  });

  it("項目が空の場合は空文字を返す", () => {
    expect(pageItemsToText([])).toBe("");
  });
});

describe("pagesToMarkdown", () => {
  it("見出しなしの場合はページを空行区切りで連結する", () => {
    const result = pagesToMarkdown(["1ページ目", "2ページ目"], {
      insertPageHeadings: false,
    });
    expect(result).toBe("1ページ目\n\n2ページ目");
  });

  it("見出しありの場合はページ番号見出しを挿入する", () => {
    const result = pagesToMarkdown(["内容A", "内容B"], {
      insertPageHeadings: true,
    });
    expect(result).toBe("## ページ 1\n\n内容A\n\n## ページ 2\n\n内容B");
  });

  it("3行以上連続する空行は2行に圧縮する", () => {
    const result = pagesToMarkdown(["", "内容"], {
      insertPageHeadings: false,
    });
    expect(result).not.toMatch(/\n{3,}/);
  });

  it("ページが空の場合は例外を投げる", () => {
    expect(() => pagesToMarkdown([], { insertPageHeadings: false })).toThrow(
      "ページがありません",
    );
  });
});
