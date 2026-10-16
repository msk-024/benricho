import ImageTracer from "imagetracerjs";
import { useState } from "react";
import type { ReactElement } from "react";
import { CHECKER_PATTERN_CLASS } from "../components/checkerBackground";
import { FileDrop } from "../components/FileDrop";
import { LabeledSlider } from "../components/LabeledSlider";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import { useObjectUrl } from "../hooks/useObjectUrl";
import {
  createCanvas,
  getCanvasImageData,
  loadImageFromFile,
} from "../lib/canvas/canvasUtils";
import { downloadBlob } from "../lib/download";
import { formatBytes, replaceExtension } from "../lib/fileName";

/** トレース前に縮小する最大辺長(処理時間の暴走防止) */
const MAX_TRACE_DIMENSION = 1024;

interface TraceResult {
  fileName: string;
  blob: Blob;
  sourceNote: string;
}

/** PNG/JPG をベクター(SVG)にトレース変換する */
export function SvgTraceTool(): ReactElement {
  const [colorCount, setColorCount] = useState(16);
  const [pathOmit, setPathOmit] = useState(8);
  const [result, setResult] = useState<TraceResult | null>(null);
  const { isProcessing, errorMessage, run } = useAsyncTask();
  const previewUrl = useObjectUrl(result?.blob ?? null);

  const handleFiles = (files: File[]): void => {
    const file = files[0];
    run(async () => {
      const image = await loadImageFromFile(file);
      const { canvas, scaled } = drawScaledForTrace(image);
      const svgText = ImageTracer.imagedataToSVG(getCanvasImageData(canvas), {
        numberofcolors: colorCount,
        pathomit: pathOmit,
      });
      const blob = new Blob([svgText], { type: "image/svg+xml" });
      setResult({
        fileName: replaceExtension(file.name, "svg"),
        blob,
        sourceNote: scaled
          ? `処理時間短縮のため ${canvas.width}×${canvas.height}px に縮小してトレースしました`
          : `${canvas.width}×${canvas.height}px をトレースしました`,
      });
    });
  };

  return (
    <div className="space-y-4">
      <LabeledSlider
        label="色数"
        min={2}
        max={32}
        step={1}
        value={colorCount}
        unit="色"
        onChange={setColorCount}
      />
      <LabeledSlider
        label="ノイズ除去(小さいパスの省略)"
        min={0}
        max={50}
        step={1}
        value={pathOmit}
        onChange={setPathOmit}
      />
      <FileDrop
        accept="image/png,image/jpeg,image/webp"
        disabled={isProcessing}
        description="PNG / JPG(1ファイル)。イラスト・ロゴ向き、写真は色数を増やしてください"
        onFiles={handleFiles}
      />
      <ToolStatus
        isProcessing={isProcessing}
        errorMessage={errorMessage}
        processingLabel="トレース中…(画像により数十秒かかります)"
      />
      {result !== null && !isProcessing && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{result.sourceNote}</p>
          {previewUrl !== null && (
            <img
              src={previewUrl}
              alt="SVGプレビュー"
              className={`max-h-80 w-full rounded border border-slate-100 object-contain ${CHECKER_PATTERN_CLASS}`}
            />
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {result.fileName}({formatBytes(result.blob.size)})
            </p>
            <button
              type="button"
              onClick={() => downloadBlob(result.blob, result.fileName)}
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
            >
              SVGをダウンロード
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** トレース対象が大きすぎる場合は縮小して描画する */
function drawScaledForTrace(image: HTMLImageElement): {
  canvas: HTMLCanvasElement;
  scaled: boolean;
} {
  const longSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale =
    longSide > MAX_TRACE_DIMENSION ? MAX_TRACE_DIMENSION / longSide : 1;
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const { canvas, context } = createCanvas(width, height);
  context.drawImage(image, 0, 0, width, height);
  return { canvas, scaled: scale < 1 };
}
