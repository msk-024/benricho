import "exceljs";

// exceljs公式の型(Xlsx.load)はNode向けのBufferしか受け付けない宣言になっているが、
// 実装自体はArrayBufferを渡しても動作する(ブラウザにはBufferが存在しないため、
// ブラウザから渡せる型をオーバーロードとして補強する)
declare module "exceljs" {
  interface Xlsx {
    load(
      buffer: ArrayBuffer,
      options?: Partial<XlsxReadOptions>,
    ): Promise<Workbook>;
  }
}
