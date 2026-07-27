import type { PixelRect } from "../imageOps";
import { computeFitRect } from "../fitRect";
import { assertPngSize } from "../pngParse";
import { buildStampFileName, type StampImageKind } from "../stampNaming";
import { canvasToPngBytes, createCanvas } from "./canvasUtils";

export interface StampSizeTarget {
  kind: StampImageKind;
  width: number;
  height: number;
  label: string;
}

/** LINEスタンプの規定サイズ(1pxのズレも許されない) */
export const STAMP_SIZE_TARGETS: readonly StampSizeTarget[] = [
  { kind: "sticker", width: 370, height: 320, label: "本体" },
  { kind: "main", width: 240, height: 240, label: "メイン" },
  { kind: "tab", width: 96, height: 74, label: "タブ" },
];

/** LINEスタンプ申請時の1セットあたりの上限枚数(超えても書き出し自体は可能、警告のみ) */
export const MAX_STICKER_COUNT = 40;

/** buildStampFileName の採番が 2 桁ゼロ埋けである仕様上の上限枚数 */
export const MAX_STAMP_INDEX = 99;

export interface StampExportFile {
  fileName: string;
  pngBytes: Uint8Array;
  note: string;
}

/**
 * 透過済みソース画像の1イラストから、LINEスタンプ規定の3サイズPNGを書き出す。
 * (LineStampTool・スタンプシート切り分けの双方から共有される、書き出しの単一実装)
 *
 * @precondition sourceCanvas は透過処理済みの画像を描画したCanvas
 * @precondition contentBounds は sourceCanvas 内に収まる矩形
 * @postcondition 各出力PNGの実寸はIHDRレベルで規定サイズと厳密一致する
 * @throws {Error} 出力PNGのサイズが規定と1pxでもズレた場合
 */
export async function renderStampSizeSet(
  sourceCanvas: HTMLCanvasElement,
  contentBounds: PixelRect,
  paddingPx: number,
  stampNumber: number,
): Promise<StampExportFile[]> {
  const results: StampExportFile[] = [];
  for (const target of STAMP_SIZE_TARGETS) {
    const pngBytes = await renderSingleStampPng(
      sourceCanvas,
      contentBounds,
      target.width,
      target.height,
      paddingPx,
    );
    // 出力サイズの厳密検証: IHDR の実寸が 1px でもズレていれば例外
    assertPngSize(pngBytes, target.width, target.height);
    results.push({
      fileName: buildStampFileName(stampNumber, target.kind),
      pngBytes,
      note: `${target.label} ${target.width}×${target.height}px ・ サイズ検証OK`,
    });
  }
  return results;
}

/** 透過領域を切り出し、余白を保って最大フィット配置した規定サイズPNGを生成する */
async function renderSingleStampPng(
  sourceCanvas: HTMLCanvasElement,
  contentBounds: PixelRect,
  targetWidth: number,
  targetHeight: number,
  paddingPx: number,
): Promise<Uint8Array> {
  const fitRect = computeFitRect(
    contentBounds.width,
    contentBounds.height,
    targetWidth,
    targetHeight,
    paddingPx,
  );
  const { canvas, context } = createCanvas(targetWidth, targetHeight);
  context.drawImage(
    sourceCanvas,
    contentBounds.x,
    contentBounds.y,
    contentBounds.width,
    contentBounds.height,
    fitRect.x,
    fitRect.y,
    fitRect.width,
    fitRect.height,
  );
  return canvasToPngBytes(canvas);
}
