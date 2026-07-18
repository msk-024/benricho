import { useState } from "react";
import type { ReactElement } from "react";
import { DownloadList, type DownloadItem } from "../components/DownloadList";
import { FileDrop } from "../components/FileDrop";
import { LabeledSlider } from "../components/LabeledSlider";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import {
  canvasToPngBytes,
  createCanvas,
  drawImageToCanvas,
  getCanvasImageData,
  loadImageFromFile,
} from "../lib/canvas/canvasUtils";
import { bytesToBlob } from "../lib/download";
import { computeFitRect } from "../lib/fitRect";
import {
  findOpaqueBounds,
  hasAnyTransparency,
  type PixelRect,
} from "../lib/imageOps";
import { assertPngSize } from "../lib/pngParse";
import { buildStampFileName } from "../lib/stampNaming";

/** LINEスタンプの規定サイズ(1pxのズレも許されない) */
const STAMP_TARGETS = [
  { kind: "sticker", width: 370, height: 320, label: "本体" },
  { kind: "main", width: 240, height: 240, label: "メイン" },
  { kind: "tab", width: 96, height: 74, label: "タブ" },
] as const;

const MAX_STICKER_COUNT = 40;

/**
 * LINEスタンプ用の3サイズ(本体370×320 / メイン240×240 / タブ96×74)を
 * 一括書き出しする。透過領域を検出して余白を保ちながら最大サイズにフィットさせ、
 * 出力PNGの実寸をIHDRレベルで厳密検証する
 */
export function LineStampTool(): ReactElement {
  const [paddingPx, setPaddingPx] = useState(10);
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const { isProcessing, errorMessage, run } = useAsyncTask();

  const handleFiles = (files: File[]): void => {
    run(async () => {
      setSuccessNote(null);
      const warningList: string[] = [];
      if (files.length > MAX_STICKER_COUNT) {
        warningList.push(
          `LINEスタンプは最大${MAX_STICKER_COUNT}個です(${files.length}件を処理しますが申請時にご注意ください)`,
        );
      }
      const results: DownloadItem[] = [];
      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        const stampNumber = fileIndex + 1;
        const image = await loadImageFromFile(file);
        const sourceCanvas = drawImageToCanvas(image);
        const imageData = getCanvasImageData(sourceCanvas);
        if (!hasAnyTransparency(imageData)) {
          warningList.push(
            `${file.name}: 透過画素がありません。LINEの規定では背景透過が必須です(「背景透過」ツールを先にご利用ください)`,
          );
        }
        const contentBounds = findOpaqueBounds(imageData) ?? {
          x: 0,
          y: 0,
          width: imageData.width,
          height: imageData.height,
        };
        for (const target of STAMP_TARGETS) {
          const pngBytes = await renderStampPng(
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
            blob: bytesToBlob(pngBytes, "image/png"),
            note: `${target.label} ${target.width}×${target.height}px ・ サイズ検証OK`,
          });
        }
      }
      setItems(results);
      setWarnings(warningList);
      setSuccessNote(
        `${files.length}枚 × 3サイズ = ${results.length}ファイルを書き出し、全出力の実寸検証に合格しました`,
      );
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p>各イラストから以下の3ファイルを書き出します(連番は選択順):</p>
        <ul className="mt-1 list-inside list-disc">
          <li>NN_sticker.png — 本体 370×320px</li>
          <li>NN_main.png — メイン画像 240×240px</li>
          <li>NN_tab.png — タブ画像 96×74px</li>
        </ul>
      </div>
      <LabeledSlider
        label="キャンバス端の余白"
        min={0}
        max={20}
        step={1}
        value={paddingPx}
        unit="px"
        onChange={setPaddingPx}
      />
      <FileDrop
        accept="image/png,image/webp"
        multiple
        disabled={isProcessing}
        description="背景透過済みPNG(複数可・最大40枚)。選択順に 01, 02, … と採番します"
        onFiles={handleFiles}
      />
      <ToolStatus
        isProcessing={isProcessing}
        errorMessage={errorMessage}
        processingLabel="3サイズを書き出し中…"
      />
      {warnings.length > 0 && (
        <ul className="space-y-1 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warnings.map((warning) => (
            <li key={warning}>⚠ {warning}</li>
          ))}
        </ul>
      )}
      {successNote !== null && !isProcessing && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✓ {successNote}
        </p>
      )}
      <DownloadList items={items} zipFileName="line_stamp_images.zip" />
    </div>
  );
}

/** 透過領域を切り出し、余白を保って最大フィット配置した規定サイズPNGを生成する */
async function renderStampPng(
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
