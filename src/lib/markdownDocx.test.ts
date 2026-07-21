import { Packer } from "docx";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { markdownToDocument } from "./markdownDocx";

/** Document を実際に .docx へシリアライズし、word/document.xml を取り出す */
async function renderDocumentXml(markdown: string): Promise<string> {
  const blob = await Packer.toBlob(markdownToDocument(markdown));
  const zipBytes = new Uint8Array(await blob.arrayBuffer());
  const files = unzipSync(zipBytes);
  const documentXml = files["word/document.xml"];
  expect(documentXml).toBeDefined();
  return strFromU8(documentXml);
}

describe("markdownToDocument", () => {
  it("見出し・段落・強調を含む文書を生成できる", async () => {
    const xml = await renderDocumentXml(
      "# レポート\n\nこれは **重要** な文章です。",
    );
    expect(xml).toContain("レポート");
    expect(xml).toContain("重要");
    expect(xml).toContain("Heading1");
    expect(xml).toContain("<w:b/>");
  });

  it("番号付きリストと箇条書きを生成できる", async () => {
    const xml = await renderDocumentXml(
      "- りんご\n- みかん\n\n1. 一番\n2. 二番",
    );
    expect(xml).toContain("りんご");
    expect(xml).toContain("二番");
    expect(xml).toContain("<w:numPr>");
  });

  it("表とコードブロックを生成できる", async () => {
    const xml = await renderDocumentXml(
      "| 項目 | 値 |\n| --- | --- |\n| a | 1 |\n\n```\nconst x = 1\n```",
    );
    expect(xml).toContain("<w:tbl>");
    expect(xml).toContain("項目");
    expect(xml).toContain("const x = 1");
  });

  it("リンクをハイパーリンクとして埋め込む", async () => {
    const xml = await renderDocumentXml("[香川](https://example.com/kagawa)");
    expect(xml).toContain("香川");
    expect(xml).toContain("w:hyperlink");
  });

  it("HTMLエンティティを二重エスケープしない(& が &amp;amp; にならない)", async () => {
    const xml = await renderDocumentXml("A & B `x<y`");
    expect(xml).toContain("A &amp; B");
    expect(xml).toContain("x&lt;y");
    expect(xml).not.toContain("&amp;amp;");
    expect(xml).not.toContain("&amp;lt;");
  });

  it("空のMarkdownでも正常な文書を生成する", async () => {
    const xml = await renderDocumentXml("");
    expect(xml).toContain("<w:body>");
  });
});
