import type { ComponentType } from "react";
import {
  AspectRatioTool,
  BgRemoveTool,
  ColorConvertTool,
  CsvToMarkdownTool,
  ExifRemoveTool,
  FaviconTool,
  IcoConvertTool,
  ImageResizeTool,
  ImageToPdfTool,
  LineStampTool,
  MarkdownConvertTool,
  MotionGlossaryTool,
  PdfCompressTool,
  PdfMergeTool,
  PdfSplitTool,
  ScreenshotTrimTool,
  StampSheetTool,
  SvgTraceTool,
  TextCountTool,
  UnitConvertTool,
  WebpConvertTool,
} from "./lazyToolComponents";

export type ToolCategory =
  "画像" | "LINEスタンプ" | "ドキュメント" | "Web制作" | "リファレンス";

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  component: ComponentType;
  /** trueなら他ツールより広いレイアウト幅を使う(一覧を並べて眺めるギャラリー系ツール向け) */
  wide?: boolean;
}

export const TOOL_CATEGORIES: readonly ToolCategory[] = [
  "画像",
  "LINEスタンプ",
  "ドキュメント",
  "Web制作",
  "リファレンス",
];

export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    id: "webp-convert",
    name: "WebP変換",
    description: "PNG / JPG ⇄ WebP を相互変換します(品質指定つき)",
    category: "画像",
    component: WebpConvertTool,
  },
  {
    id: "svg-trace",
    name: "SVG変換(トレース)",
    description: "PNG / JPG をベクター形式のSVGにトレース変換します",
    category: "画像",
    component: SvgTraceTool,
  },
  {
    id: "bg-remove",
    name: "背景透過",
    description: "画像の背景(四隅と近い色の領域)を透過します",
    category: "画像",
    component: BgRemoveTool,
  },
  {
    id: "image-resize",
    name: "画像リサイズ",
    description: "SNS投稿用 / OGP / サムネ用プリセットでリサイズ+圧縮します",
    category: "画像",
    component: ImageResizeTool,
  },
  {
    id: "favicon",
    name: "ファビコン生成",
    description: "複数サイズのPNGとfavicon.icoを一括生成します",
    category: "画像",
    component: FaviconTool,
  },
  {
    id: "ico-convert",
    name: "ICO変換",
    description: "画像を複数サイズ内包のICOファイルに変換します",
    category: "画像",
    component: IcoConvertTool,
  },
  {
    id: "exif-remove",
    name: "EXIF削除",
    description: "位置情報などのメタデータを削除します(通常は画質劣化なし)",
    category: "画像",
    component: ExifRemoveTool,
  },
  {
    id: "screenshot-trim",
    name: "余白トリミング",
    description: "スクリーンショットの余白を自動検出して切り落とします",
    category: "画像",
    component: ScreenshotTrimTool,
  },
  {
    id: "line-stamp",
    name: "LINEスタンプ書き出し",
    description:
      "本体370×320 / メイン240×240 / タブ96×74 を一括書き出し+採番します",
    category: "LINEスタンプ",
    component: LineStampTool,
  },
  {
    id: "stamp-sheet",
    name: "スタンプシート切り分け",
    description:
      "1枚のシート画像から複数イラストを自動検出し、枠調整してLINEスタンプ3サイズへ書き出します",
    category: "LINEスタンプ",
    component: StampSheetTool,
  },
  {
    id: "markdown-convert",
    name: "Markdown変換",
    description: "Markdown を Word(.docx) / PDF / HTML に変換します",
    category: "ドキュメント",
    component: MarkdownConvertTool,
  },
  {
    id: "csv-to-markdown",
    name: "CSV→Markdown表",
    description: "CSV を Markdown のテーブル記法に変換します",
    category: "ドキュメント",
    component: CsvToMarkdownTool,
  },
  {
    id: "text-count",
    name: "文字数カウント・全角半角統一",
    description: "文字数・行数・バイト数の計測と全角半角の統一変換を行います",
    category: "ドキュメント",
    component: TextCountTool,
  },
  {
    id: "pdf-merge",
    name: "PDF結合",
    description: "複数のPDFを指定した順番で1つに結合します",
    category: "ドキュメント",
    component: PdfMergeTool,
  },
  {
    id: "pdf-split",
    name: "PDF分割・ページ抽出",
    description: "1ページずつの分割、またはページ範囲の抽出を行います",
    category: "ドキュメント",
    component: PdfSplitTool,
  },
  {
    id: "pdf-compress",
    name: "PDF圧縮",
    description: "ページを再描画してPDFのファイルサイズを削減します",
    category: "ドキュメント",
    component: PdfCompressTool,
  },
  {
    id: "image-to-pdf",
    name: "画像→PDF一括変換",
    description: "複数の画像を1つのPDFにまとめます(1画像=1ページ)",
    category: "ドキュメント",
    component: ImageToPdfTool,
  },
  {
    id: "unit-convert",
    name: "px⇔rem/em/pt変換",
    description:
      "基準フォントサイズを指定して単位を相互変換し、そのまま貼れるCSSをコピーできます",
    category: "Web制作",
    component: UnitConvertTool,
  },
  {
    id: "aspect-ratio",
    name: "縦横比・高さ計算",
    description: "横幅と比率から高さを計算、または幅と高さから比率を約分します",
    category: "Web制作",
    component: AspectRatioTool,
  },
  {
    id: "color-convert",
    name: "カラーコード変換",
    description: "HEX⇔RGB⇔HSLを透明度つきで相互変換します",
    category: "Web制作",
    component: ColorConvertTool,
  },
  {
    id: "motion-glossary",
    name: "うごき辞典",
    description:
      "見たことある動きの名前をデモ・オノマトペから探し、AIへの頼み方をコピーできます",
    category: "リファレンス",
    component: MotionGlossaryTool,
    wide: true,
  },
];
