import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  extractPdfPages,
  getPdfPageCount,
  mergePdfs,
  splitPdfToSinglePages,
} from "./pdfOps";

/** テスト用: 指定ページ数のPDFを生成する(各ページにサイズ差をつけて識別可能にする) */
async function makeTestPdf(pageCount: number): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    document.addPage([200 + i * 10, 300]);
  }
  return document.save();
}

describe("getPdfPageCount", () => {
  it("総ページ数を返す", async () => {
    expect(await getPdfPageCount(await makeTestPdf(3))).toBe(3);
  });

  it("PDF以外のデータでは分かりやすいエラーを投げる", async () => {
    await expect(getPdfPageCount(new Uint8Array([1, 2, 3]))).rejects.toThrow(
      "読み込みに失敗",
    );
  });
});

describe("mergePdfs", () => {
  it("複数PDFを順番どおりに結合する", async () => {
    const merged = await mergePdfs([
      await makeTestPdf(2),
      await makeTestPdf(3),
    ]);
    const document = await PDFDocument.load(merged);
    expect(document.getPageCount()).toBe(5);
    // 先頭は1つ目のPDFの1ページ目(幅200)
    expect(document.getPage(0).getWidth()).toBeCloseTo(200);
    // 3ページ目からは2つ目のPDF(幅200から再開)
    expect(document.getPage(2).getWidth()).toBeCloseTo(200);
    expect(document.getPage(4).getWidth()).toBeCloseTo(220);
  });

  it("1件以下では RangeError を投げる", async () => {
    await expect(mergePdfs([await makeTestPdf(1)])).rejects.toThrow(RangeError);
  });
});

describe("extractPdfPages", () => {
  it("指定ページを記載順に抽出する(並べ替えも可能)", async () => {
    const source = await makeTestPdf(4);
    const extracted = await extractPdfPages(source, [3, 1]);
    const document = await PDFDocument.load(extracted);
    expect(document.getPageCount()).toBe(2);
    expect(document.getPage(0).getWidth()).toBeCloseTo(220); // 元3ページ目
    expect(document.getPage(1).getWidth()).toBeCloseTo(200); // 元1ページ目
  });

  it("範囲外ページ・空指定で RangeError を投げる", async () => {
    const source = await makeTestPdf(2);
    await expect(extractPdfPages(source, [3])).rejects.toThrow("範囲外");
    await expect(extractPdfPages(source, [])).rejects.toThrow(RangeError);
  });
});

describe("splitPdfToSinglePages", () => {
  it("1ページずつのPDF群に分割する", async () => {
    const parts = await splitPdfToSinglePages(await makeTestPdf(3));
    expect(parts).toHaveLength(3);
    for (const [index, part] of parts.entries()) {
      const document = await PDFDocument.load(part);
      expect(document.getPageCount()).toBe(1);
      expect(document.getPage(0).getWidth()).toBeCloseTo(200 + index * 10);
    }
  });
});
