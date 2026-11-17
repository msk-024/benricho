import { describe, expect, it } from "vitest";
import { escapeMarkdownCell, rowsToMarkdownTable } from "./markdownTable";

describe("rowsToMarkdownTable", () => {
  it("ヘッダー行ありの行列を表に変換する", () => {
    const result = rowsToMarkdownTable(
      [
        ["名前", "年齢"],
        ["太郎", "30"],
      ],
      { hasHeaderRow: true },
    );
    expect(result).toBe(
      ["| 名前 | 年齢 |", "| --- | --- |", "| 太郎 | 30 |"].join("\n"),
    );
  });

  it("ヘッダー行なしの場合は「列N」を自動生成する", () => {
    const result = rowsToMarkdownTable([["a", "b", "c"]], {
      hasHeaderRow: false,
    });
    expect(result).toBe(
      ["| 列1 | 列2 | 列3 |", "| --- | --- | --- |", "| a | b | c |"].join(
        "\n",
      ),
    );
  });

  it("列数が揃っていない行は空セルで埋める", () => {
    const result = rowsToMarkdownTable(
      [
        ["a", "b", "c"],
        ["1", "2"],
      ],
      {
        hasHeaderRow: true,
      },
    );
    expect(result.split("\n")[2]).toBe("| 1 | 2 |  |");
  });

  it("データ行が1行もない場合は例外を投げる", () => {
    expect(() => rowsToMarkdownTable([], { hasHeaderRow: false })).toThrow(
      "データ行がありません",
    );
  });

  it("ヘッダー行のみでデータ行がない場合は例外を投げる", () => {
    expect(() =>
      rowsToMarkdownTable([["のみ", "ヘッダー"]], { hasHeaderRow: true }),
    ).toThrow("データ行がありません");
  });
});

describe("escapeMarkdownCell", () => {
  it("パイプ・バックスラッシュ・改行を安全な表現に変換する", () => {
    expect(escapeMarkdownCell("a|b")).toBe("a\\|b");
    expect(escapeMarkdownCell("a\\b")).toBe("a\\\\b");
    expect(escapeMarkdownCell("line1\nline2")).toBe("line1<br>line2");
  });
});
