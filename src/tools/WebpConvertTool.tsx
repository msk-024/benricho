import { useState } from "react";
import type { ReactElement } from "react";
import { DownloadList, type DownloadItem } from "../components/DownloadList";
import { FileDrop } from "../components/FileDrop";
import { LabeledSlider } from "../components/LabeledSlider";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import {
  canvasToBlob,
  drawImageToCanvas,
  loadImageFromFile,
} from "../lib/canvas/canvasUtils";
import { replaceExtension } from "../lib/fileName";

const OUTPUT_FORMATS = [
  {
    mimeType: "image/webp",
    label: "WebP",
    extension: "webp",
    hasQuality: true,
  },
  { mimeType: "image/png", label: "PNG", extension: "png", hasQuality: false },
  { mimeType: "image/jpeg", label: "JPEG", extension: "jpg", hasQuality: true },
] as const;

type OutputMimeType = (typeof OUTPUT_FORMATS)[number]["mimeType"];

/** PNG/JPG ⇄ WebP 変換(双方向)。出力形式と品質を選んで一括変換する */
export function WebpConvertTool(): ReactElement {
  const [outputMimeType, setOutputMimeType] =
    useState<OutputMimeType>("image/webp");
  const [qualityPercent, setQualityPercent] = useState(85);
  const [items, setItems] = useState<DownloadItem[]>([]);
  const { isProcessing, errorMessage, run } = useAsyncTask();

  const selectedFormat =
    OUTPUT_FORMATS.find((format) => format.mimeType === outputMimeType) ??
    OUTPUT_FORMATS[0];

  const handleFiles = (files: File[]): void => {
    run(async () => {
      const results: DownloadItem[] = [];
      for (const file of files) {
        const image = await loadImageFromFile(file);
        // JPEG は透過を持てないため白下地を敷く
        const canvas = drawImageToCanvas(
          image,
          outputMimeType === "image/jpeg" ? "#ffffff" : undefined,
        );
        const blob = await canvasToBlob(
          canvas,
          outputMimeType,
          selectedFormat.hasQuality ? qualityPercent / 100 : undefined,
        );
        results.push({
          fileName: replaceExtension(file.name, selectedFormat.extension),
          blob,
          note: `${canvas.width}×${canvas.height}px`,
        });
      }
      setItems(results);
    });
  };

  return (
    <div className="space-y-4">
      <fieldset className="flex flex-wrap items-center gap-4">
        <legend className="mb-2 text-sm font-medium text-slate-700">
          出力形式
        </legend>
        {OUTPUT_FORMATS.map((format) => (
          <label
            key={format.mimeType}
            className="flex items-center gap-1.5 text-sm text-slate-700"
          >
            <input
              type="radio"
              name="webp-output-format"
              checked={outputMimeType === format.mimeType}
              onChange={() => setOutputMimeType(format.mimeType)}
              className="accent-sky-600"
            />
            {format.label}
          </label>
        ))}
      </fieldset>
      {outputMimeType === "image/webp" && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠ Safariでは WebP
          形式での書き出しに対応していない場合があります。うまく変換できない場合はChromeなど他のブラウザをお試しください。
        </p>
      )}
      {selectedFormat.hasQuality && (
        <LabeledSlider
          label="品質"
          min={10}
          max={100}
          step={5}
          value={qualityPercent}
          unit="%"
          onChange={setQualityPercent}
        />
      )}
      <FileDrop
        accept="image/png,image/jpeg,image/webp"
        multiple
        disabled={isProcessing}
        description="PNG / JPG / WebP(複数可)"
        onFiles={handleFiles}
      />
      <ToolStatus
        isProcessing={isProcessing}
        errorMessage={errorMessage}
        processingLabel="変換中…"
      />
      <DownloadList items={items} zipFileName="converted_images.zip" />
    </div>
  );
}
