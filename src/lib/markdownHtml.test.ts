import { describe, expect, it } from "vitest";
import { markdownToHtmlDocument, markdownToHtmlFragment } from "./markdownHtml";

describe("markdownToHtmlFragment", () => {
  it("見出し・強調・表を含むGFMをHTMLに変換する", () => {
    const html = markdownToHtmlFragment(
      "# 題名\n\n**太字** です\n\n| a | b |\n| --- | --- |\n| 1 | 2 |",
    );
    expect(html).toContain("<h1>題名</h1>");
    expect(html).toContain("<strong>太字</strong>");
    expect(html).toContain("<table>");
  });
});

describe("markdownToHtmlDocument", () => {
  it("スタイル込みの完全なHTML文書を生成する", () => {
    const doc = markdownToHtmlDocument("# こんにちは", "テスト文書");
    expect(doc).toContain("<!doctype html>");
    expect(doc).toContain("<title>テスト文書</title>");
    expect(doc).toContain("<h1>こんにちは</h1>");
    expect(doc).toContain(".markdown-body");
  });

  it("タイトル内のHTML特殊文字をエスケープする", () => {
    const doc = markdownToHtmlDocument("本文", '<script>&"x"</script>');
    expect(doc).toContain(
      "<title>&lt;script&gt;&amp;&quot;x&quot;&lt;/script&gt;</title>",
    );
  });
});
