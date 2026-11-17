// exceljsの通常の読み込み(import "exceljs")はNode専用ビルド(excel.js)を指しており、
// モジュール読み込み時に process.versions を参照するためブラウザでは即座に例外になる。
// そのためブラウザ向けには事前ビルド済みのdistバンドルを使う必要があるが、
// この副パスには型定義が同梱されていないため、本体の型を再エクスポートして補強する。
//
// 注: このファイル自体がトップレベルの import/export を持つと「既存モジュールの
// 拡張(module augmentation)」とみなされ、新規の ambient module 宣言として
// 機能しなくなるため、本ファイルは他モジュールを import せず単独で保つこと
// (Xlsx.load のオーバーロード補強は ./exceljs-augment.d.ts 側で行う)
declare module "exceljs/dist/exceljs.bare.min.js" {
  export { Workbook } from "exceljs";
}
