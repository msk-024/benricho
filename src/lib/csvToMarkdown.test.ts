import { describe, expect, it } from "vitest";
import { csvToMarkdownTable } from "./csvToMarkdown";

describe("csvToMarkdownTable", () => {
  it("ヘッダー行ありのCSVを表に変換する", () => {
    const result = csvToMarkdownTable("名前,年齢\n太郎,30\n花子,25", {
      hasHeaderRow: true,
    });
    expect(result).toBe(
      [
        "| 名前 | 年齢 |",
        "| --- | --- |",
        "| 太郎 | 30 |",
        "| 花子 | 25 |",
      ].join("\n"),
    );
  });

  it("ヘッダー行なしの場合は「列N」を自動生成する", () => {
    const result = csvToMarkdownTable("a,b,c", { hasHeaderRow: false });
    expect(result).toBe(
      ["| 列1 | 列2 | 列3 |", "| --- | --- | --- |", "| a | b | c |"].join(
        "\n",
      ),
    );
  });

  it("引用符内のカンマ・改行・パイプを正しく扱う", () => {
    const csv = 'title,body\n"a,b","line1\nline2"\nc,"x|y"';
    const result = csvToMarkdownTable(csv, { hasHeaderRow: true });
    const lines = result.split("\n");
    expect(lines[2]).toBe("| a,b | line1<br>line2 |");
    expect(lines[3]).toBe("| c | x\\|y |");
  });

  it("列数が揃っていない行は空セルで埋める", () => {
    const result = csvToMarkdownTable("a,b,c\n1,2", { hasHeaderRow: true });
    expect(result.split("\n")[2]).toBe("| 1 | 2 |  |");
  });

  it("大量行でもスタックオーバーフローせず列数を算出する", () => {
    const rowCount = 150_000;
    const csv = `a,b\n${Array.from({ length: rowCount }, () => "1,2").join("\n")}`;
    const result = csvToMarkdownTable(csv, { hasHeaderRow: true });
    expect(result.split("\n")).toHaveLength(2 + rowCount);
  });

  it("データがない場合は例外を投げる", () => {
    expect(() => csvToMarkdownTable("   ", { hasHeaderRow: false })).toThrow();
    expect(() =>
      csvToMarkdownTable("のみ,ヘッダー", { hasHeaderRow: true }),
    ).toThrow("データ行がありません");
  });
});
