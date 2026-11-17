import { Workbook } from "exceljs/dist/exceljs.bare.min.js";
import { describe, expect, it } from "vitest";
import { excelToMarkdown } from "./excelToMarkdown";

describe("excelToMarkdown", () => {
  it("1シートをヘッダー行つきのMarkdown表に変換する", async () => {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("シート1");
    sheet.addRow(["名前", "年齢"]);
    sheet.addRow(["太郎", 30]);
    const bytes = await workbook.xlsx.writeBuffer();

    const markdown = await excelToMarkdown(toArrayBuffer(bytes), {
      hasHeaderRow: true,
    });
    expect(markdown).toContain("## シート1");
    expect(markdown).toContain("| 名前 | 年齢 |");
    expect(markdown).toContain("| 太郎 | 30 |");
  });

  it("複数シートをそれぞれ見出し付きで変換する", async () => {
    const workbook = new Workbook();
    workbook.addWorksheet("売上").addRow(["4月", "100"]);
    workbook.addWorksheet("在庫").addRow(["商品A", "5"]);
    const bytes = await workbook.xlsx.writeBuffer();

    const markdown = await excelToMarkdown(toArrayBuffer(bytes), {
      hasHeaderRow: false,
    });
    expect(markdown).toContain("## 売上");
    expect(markdown).toContain("## 在庫");
    expect(markdown).toContain("| 4月 | 100 |");
  });

  it("空シートは注記のみ出力し他のシートの変換を継続する", async () => {
    const workbook = new Workbook();
    workbook.addWorksheet("空シート");
    workbook.addWorksheet("データ").addRow(["a", "b"]);
    const bytes = await workbook.xlsx.writeBuffer();

    const markdown = await excelToMarkdown(toArrayBuffer(bytes), {
      hasHeaderRow: false,
    });
    expect(markdown).toContain("## 空シート\n\n(空のシートです)");
    expect(markdown).toContain("| a | b |");
  });

  it("数式セルは計算結果を文字列化する", async () => {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("計算");
    sheet.addRow(["値"]);
    sheet.getCell("A2").value = { formula: "1+1", result: 2 };
    const bytes = await workbook.xlsx.writeBuffer();

    const markdown = await excelToMarkdown(toArrayBuffer(bytes), {
      hasHeaderRow: true,
    });
    expect(markdown).toContain("| 2 |");
  });

  it("壊れたファイルの場合は例外を投げる", async () => {
    const bytes = new TextEncoder().encode("not an excel file");
    await expect(
      excelToMarkdown(toArrayBuffer(bytes), { hasHeaderRow: false }),
    ).rejects.toThrow("読み込みに失敗");
  });
});

// exceljsの型定義はグローバルBufferをArrayBuffer拡張として再宣言しており、
// @types/node本来のBuffer(Uint8Array拡張)と衝突して壊れた型になるため、
// writeBuffer() の戻り値だけはここでunknown経由で型を迂回する(実体は実行時に
// 本物のUint8Array/Bufferなので、.buffer/.byteOffset/.byteLengthは安全に使える)
function toArrayBuffer(bufferLike: unknown): ArrayBuffer {
  const bytes = bufferLike as Uint8Array;
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}
