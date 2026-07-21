import { useState } from "react";
import type { ReactElement } from "react";
import { DownloadList, type DownloadItem } from "../components/DownloadList";
import { FileDrop } from "../components/FileDrop";
import { LabeledSlider } from "../components/LabeledSlider";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import {
  canvasToBlob,
  createCanvas,
  drawImageToCanvas,
  getCanvasImageData,
  loadImageFromFile,
} from "../lib/canvas/canvasUtils";
import { appendSuffix, replaceExtension } from "../lib/fileName";
import { detectContentRect } from "../lib/imageOps";

/** スクリーンショット外周の均一色余白を自動検出してトリミングする */
export function ScreenshotTrimTool(): ReactElement {
  const [tolerance, setTolerance] = useState(16);
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [skippedNotes, setSkippedNotes] = useState<string[]>([]);
  const { isProcessing, errorMessage, run } = useAsyncTask();

  const handleFiles = (files: File[]): void => {
    run(async () => {
      const results: DownloadItem[] = [];
      const skipped: string[] = [];
      for (const file of files) {
        const image = await loadImageFromFile(file);
        const sourceCanvas = drawImageToCanvas(image);
        const contentRect = detectContentRect(
          getCanvasImageData(sourceCanvas),
          tolerance,
        );
        if (contentRect === null) {
          skipped.push(`${file.name}: 全面が均一色のためスキップしました`);
          continue;
        }
        if (
          contentRect.width === sourceCanvas.width &&
          contentRect.height === sourceCanvas.height
        ) {
          skipped.push(
            `${file.name}: 余白が検出されませんでした(許容差を上げると検出できる場合があります)`,
          );
          continue;
        }
        const { canvas, context } = createCanvas(
          contentRect.width,
          contentRect.height,
        );
        context.drawImage(
          sourceCanvas,
          contentRect.x,
          contentRect.y,
          contentRect.width,
          contentRect.height,
          0,
          0,
          contentRect.width,
          contentRect.height,
        );
        results.push({
          fileName: appendSuffix(
            replaceExtension(file.name, "png"),
            "_trimmed",
          ),
          blob: await canvasToBlob(canvas, "image/png"),
          note: `${sourceCanvas.width}×${sourceCanvas.height} → ${contentRect.width}×${contentRect.height}px`,
        });
      }
      setItems(results);
      setSkippedNotes(skipped);
    });
  };

  return (
    <div className="space-y-4">
      <LabeledSlider
        label="許容差(影やわずかな色ムラを余白として扱う度合い)"
        min={0}
        max={64}
        step={2}
        value={tolerance}
        onChange={setTolerance}
      />
      <FileDrop
        accept="image/png,image/jpeg,image/webp"
        multiple
        disabled={isProcessing}
        description="スクリーンショット画像(複数可)。左上隅の色を余白色として検出します"
        onFiles={handleFiles}
      />
      <ToolStatus
        isProcessing={isProcessing}
        errorMessage={errorMessage}
        processingLabel="余白を検出中…"
      />
      {skippedNotes.length > 0 && (
        <ul className="space-y-1 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {skippedNotes.map((note) => (
            <li key={note}>ℹ {note}</li>
          ))}
        </ul>
      )}
      <DownloadList items={items} zipFileName="trimmed_images.zip" />
    </div>
  );
}
