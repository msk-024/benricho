import { lazy } from "react";

// 各ツールは選択されて初めて読み込む(初回ロードのバンドルサイズを抑えるため)。
// pdf-lib/pdfjs-dist/docx/html2canvas/imagetracerjs 等の重量ライブラリは
// 実際にそのツールを開いたときだけ取得される。
// (registry.tsx とファイルを分けているのは、コンポーネント以外の値を
//  同じファイルからエクスポートするとReact Fast Refreshの境界検出が壊れるため)
export const WebpConvertTool = lazy(() =>
  import("./WebpConvertTool").then((m) => ({ default: m.WebpConvertTool })),
);
export const SvgTraceTool = lazy(() =>
  import("./SvgTraceTool").then((m) => ({ default: m.SvgTraceTool })),
);
export const BgRemoveTool = lazy(() =>
  import("./BgRemoveTool").then((m) => ({ default: m.BgRemoveTool })),
);
export const ImageResizeTool = lazy(() =>
  import("./ImageResizeTool").then((m) => ({ default: m.ImageResizeTool })),
);
export const FaviconTool = lazy(() =>
  import("./FaviconTool").then((m) => ({ default: m.FaviconTool })),
);
export const IcoConvertTool = lazy(() =>
  import("./IcoConvertTool").then((m) => ({ default: m.IcoConvertTool })),
);
export const ExifRemoveTool = lazy(() =>
  import("./ExifRemoveTool").then((m) => ({ default: m.ExifRemoveTool })),
);
export const ScreenshotTrimTool = lazy(() =>
  import("./ScreenshotTrimTool").then((m) => ({
    default: m.ScreenshotTrimTool,
  })),
);
export const LineStampTool = lazy(() =>
  import("./LineStampTool").then((m) => ({ default: m.LineStampTool })),
);
export const StampSheetTool = lazy(() =>
  import("./StampSheetTool").then((m) => ({ default: m.StampSheetTool })),
);
export const MarkdownConvertTool = lazy(() =>
  import("./MarkdownConvertTool").then((m) => ({
    default: m.MarkdownConvertTool,
  })),
);
export const CsvToMarkdownTool = lazy(() =>
  import("./CsvToMarkdownTool").then((m) => ({
    default: m.CsvToMarkdownTool,
  })),
);
export const TextCountTool = lazy(() =>
  import("./TextCountTool").then((m) => ({ default: m.TextCountTool })),
);
export const PdfMergeTool = lazy(() =>
  import("./PdfMergeTool").then((m) => ({ default: m.PdfMergeTool })),
);
export const PdfSplitTool = lazy(() =>
  import("./PdfSplitTool").then((m) => ({ default: m.PdfSplitTool })),
);
export const PdfCompressTool = lazy(() =>
  import("./PdfCompressTool").then((m) => ({ default: m.PdfCompressTool })),
);
export const ImageToPdfTool = lazy(() =>
  import("./ImageToPdfTool").then((m) => ({ default: m.ImageToPdfTool })),
);
export const UnitConvertTool = lazy(() =>
  import("./UnitConvertTool").then((m) => ({ default: m.UnitConvertTool })),
);
export const AspectRatioTool = lazy(() =>
  import("./AspectRatioTool").then((m) => ({ default: m.AspectRatioTool })),
);
export const ColorConvertTool = lazy(() =>
  import("./ColorConvertTool").then((m) => ({ default: m.ColorConvertTool })),
);
export const MotionGlossaryTool = lazy(() =>
  import("./MotionGlossaryTool").then((m) => ({
    default: m.MotionGlossaryTool,
  })),
);
