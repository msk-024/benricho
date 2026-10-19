import { useState } from "react";
import type { ReactElement } from "react";
import { CHECKER_PATTERN_CLASS } from "../components/checkerBackground";
import { FileDrop } from "../components/FileDrop";
import { LabeledSlider } from "../components/LabeledSlider";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import { useObjectUrl } from "../hooks/useObjectUrl";
import {
  canvasToBlob,
  drawImageToCanvas,
  getCanvasImageData,
  imageDataToCanvas,
  loadImageFromFile,
} from "../lib/canvas/canvasUtils";
import { downloadBlob } from "../lib/download";
import { replaceExtension } from "../lib/fileName";
import { removeBackgroundByFloodFill } from "../lib/imageOps";

interface RemovalResult {
  fileName: string;
  originalBlob: Blob;
  resultBlob: Blob;
  removedPercent: number;
}

/**
 * 背景透過ツール。画像の四隅と色が近い連結領域を背景とみなして透過する
 * (単色・グラデーションの薄い背景向け。複雑な背景はAIモデルが必要なため対象外)
 */
export function BgRemoveTool(): ReactElement {
  const [tolerance, setTolerance] = useState(30);
  const [result, setResult] = useState<RemovalResult | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const { isProcessing, errorMessage, run } = useAsyncTask();
  const originalUrl = useObjectUrl(result?.originalBlob ?? null);
  const resultUrl = useObjectUrl(result?.resultBlob ?? null);

  const processFile = (file: File, toleranceValue: number): void => {
    run(async () => {
      const image = await loadImageFromFile(file);
      const canvas = drawImageToCanvas(image);
      const imageData = getCanvasImageData(canvas);
      const removal = removeBackgroundByFloodFill(imageData, toleranceValue);
      const resultImageData = new ImageData(
        removal.data,
        imageData.width,
        imageData.height,
      );
      const resultBlob = await canvasToBlob(
        imageDataToCanvas(resultImageData),
        "image/png",
      );
      const originalBlob = await canvasToBlob(canvas, "image/png");
      const totalPixels = imageData.width * imageData.height;
      setResult({
        fileName: replaceExtension(file.name, "png"),
        originalBlob,
        resultBlob,
        removedPercent: Math.round(
          (removal.removedPixelCount / totalPixels) * 100,
        ),
      });
      setLastFile(file);
    });
  };

  return (
    <div className="space-y-4">
      <LabeledSlider
        label="許容差(大きいほど広い色範囲を背景とみなす)"
        min={0}
        max={128}
        step={2}
        value={tolerance}
        disabled={isProcessing}
        onChange={(value) => {
          setTolerance(value);
          if (lastFile !== null) processFile(lastFile, value);
        }}
      />
      <FileDrop
        accept="image/png,image/jpeg,image/webp"
        disabled={isProcessing}
        description="PNG / JPG(1ファイル)。背景が単色に近い画像で効果的です"
        onFiles={(files) => processFile(files[0], tolerance)}
      />
      <ToolStatus
        isProcessing={isProcessing}
        errorMessage={errorMessage}
        processingLabel="背景を解析中…"
      />
      {result !== null && !isProcessing && (
        <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-ink-soft">
            画素の {result.removedPercent}% を透過しました
          </p>
          <div className="grid grid-cols-2 gap-3">
            <figure>
              <figcaption className="mb-1 text-xs text-muted">
                変換前
              </figcaption>
              {originalUrl !== null && (
                <img
                  src={originalUrl}
                  alt="変換前"
                  className="max-h-64 w-full rounded border border-line-subtle object-contain"
                />
              )}
            </figure>
            <figure>
              <figcaption className="mb-1 text-xs text-muted">
                変換後(市松模様=透過)
              </figcaption>
              {resultUrl !== null && (
                <img
                  src={resultUrl}
                  alt="変換後"
                  className={`max-h-64 w-full rounded border border-line-subtle object-contain ${CHECKER_PATTERN_CLASS}`}
                />
              )}
            </figure>
          </div>
          <button
            type="button"
            onClick={() => downloadBlob(result.resultBlob, result.fileName)}
            className="rounded-lg bg-action-primary px-4 py-2 text-sm font-medium text-ink-inverted hover:bg-action-primary-hover"
          >
            透過PNGをダウンロード
          </button>
        </div>
      )}
    </div>
  );
}
