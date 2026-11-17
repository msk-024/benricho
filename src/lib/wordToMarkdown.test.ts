import { describe, expect, it } from "vitest";
import { markdownToDocxBlob } from "./markdownDocx";
import { wordToMarkdown } from "./wordToMarkdown";

describe("wordToMarkdown", () => {
  it("見出し・強調を保持してMarkdownに変換する", async () => {
    const blob = await markdownToDocxBlob("# 見出し\n\nこれは**太字**です。");
    const markdown = await wordToMarkdown(await blob.arrayBuffer());
    expect(markdown).toContain("# 見出し");
    expect(markdown).toContain("太字");
  });

  it("箇条書きリストを保持する", async () => {
    const blob = await markdownToDocxBlob("- りんご\n- みかん");
    const markdown = await wordToMarkdown(await blob.arrayBuffer());
    expect(markdown).toContain("りんご");
    expect(markdown).toContain("みかん");
  });

  it("表をMarkdownの表として変換する", async () => {
    const blob = await markdownToDocxBlob(
      "| 項目 | 値 |\n| --- | --- |\n| a | 1 |\n| b | 2 |",
    );
    const markdown = await wordToMarkdown(await blob.arrayBuffer());
    expect(markdown).toContain("項目");
    expect(markdown).toContain("| --- | --- |");
    expect(markdown).toContain("| a | 1 |");
    expect(markdown).toContain("| b | 2 |");
  });

  it("壊れたファイルの場合は例外を投げる", async () => {
    const bytes = new TextEncoder().encode("not a docx");
    await expect(wordToMarkdown(bytes.buffer)).rejects.toThrow(
      "読み込みに失敗",
    );
  });
});
