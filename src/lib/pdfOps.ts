import { PDFDocument } from "pdf-lib";

/**
 * PDF を読み込む。失敗理由をユーザー向けメッセージに変換する。
 *
 * @throws {Error} 暗号化 PDF・壊れた PDF の場合
 */
async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (/encrypted/i.test(message)) {
      throw new Error("暗号化(パスワード保護)されたPDFは処理できません");
    }
    throw new Error(
      "PDFの読み込みに失敗しました(ファイルが壊れている可能性があります)",
    );
  }
}

/**
 * 複数の PDF を 1 つに結合する。
 *
 * @precondition pdfBytesList は 2 件以上
 * @postcondition 戻り値の総ページ数は入力の合計に一致する
 * @throws {RangeError} 入力が 1 件以下の場合
 * @throws {Error} いずれかの PDF が読み込めない場合
 */
export async function mergePdfs(
  pdfBytesList: readonly Uint8Array[],
): Promise<Uint8Array> {
  if (pdfBytesList.length < 2)
    throw new RangeError("結合には2つ以上のPDFを選択してください");
  const merged = await PDFDocument.create();
  for (const bytes of pdfBytesList) {
    const source = await loadPdf(bytes);
    const pages = await merged.copyPages(source, source.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }
  return merged.save();
}

/** PDF の総ページ数を返す */
export async function getPdfPageCount(bytes: Uint8Array): Promise<number> {
  const document = await loadPdf(bytes);
  return document.getPageCount();
}

/**
 * 指定ページ(1 始まり)を記載順に抽出した新しい PDF を作る。
 *
 * @precondition pageNumbers の各要素は 1〜総ページ数
 * @postcondition 戻り値のページ数は pageNumbers.length に一致する
 * @throws {RangeError} ページ番号が範囲外の場合
 */
export async function extractPdfPages(
  bytes: Uint8Array,
  pageNumbers: readonly number[],
): Promise<Uint8Array> {
  if (pageNumbers.length === 0)
    throw new RangeError("抽出するページが指定されていません");
  const source = await loadPdf(bytes);
  const pageCount = source.getPageCount();
  for (const pageNumber of pageNumbers) {
    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      pageNumber > pageCount
    ) {
      throw new RangeError(
        `ページ番号が範囲外です(1〜${pageCount}): ${pageNumber}`,
      );
    }
  }
  const extracted = await PDFDocument.create();
  const copiedPages = await extracted.copyPages(
    source,
    pageNumbers.map((pageNumber) => pageNumber - 1),
  );
  for (const page of copiedPages) extracted.addPage(page);
  return extracted.save();
}

/**
 * PDF を 1 ページずつの PDF 群に分割する。
 *
 * @postcondition 戻り値の件数は元 PDF の総ページ数に一致する
 */
export async function splitPdfToSinglePages(
  bytes: Uint8Array,
): Promise<Uint8Array[]> {
  const source = await loadPdf(bytes);
  const results: Uint8Array[] = [];
  for (const pageIndex of source.getPageIndices()) {
    const single = await PDFDocument.create();
    const [page] = await single.copyPages(source, [pageIndex]);
    single.addPage(page);
    results.push(await single.save());
  }
  return results;
}

export interface EmbeddableImage {
  bytes: Uint8Array;
  kind: "png" | "jpeg";
}

/** CSS px(96dpi) を PDF pt(72dpi) に換算する係数 */
const PT_PER_PX = 72 / 96;

/**
 * 画像群を 1 つの PDF にまとめる。各ページは画像の実寸(px→pt換算)になる。
 *
 * @precondition images は 1 件以上
 * @postcondition ページ数は images.length に一致する
 * @throws {RangeError} 入力が空の場合
 */
export async function imagesToPdf(
  images: readonly EmbeddableImage[],
): Promise<Uint8Array> {
  if (images.length === 0) throw new RangeError("画像が選択されていません");
  const document = await PDFDocument.create();
  for (const image of images) {
    const embedded =
      image.kind === "png"
        ? await document.embedPng(image.bytes)
        : await document.embedJpg(image.bytes);
    const pageWidthPt = embedded.width * PT_PER_PX;
    const pageHeightPt = embedded.height * PT_PER_PX;
    const page = document.addPage([pageWidthPt, pageHeightPt]);
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: pageWidthPt,
      height: pageHeightPt,
    });
  }
  return document.save();
}
