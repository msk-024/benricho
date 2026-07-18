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
  loadImageFromFile,
} from "../lib/canvas/canvasUtils";
import { baseName } from "../lib/fileName";

const RESIZE_PRESETS = [
  { id: "x-post", label: "SNS投稿用(X) 1200×675", width: 1200, height: 675 },
  {
    id: "instagram",
    label: "SNS投稿用(Instagram) 1080×1080",
    width: 1080,
    height: 1080,
  },
  { id: "ogp", label: "OGP画像用 1200×630", width: 1200, height: 630 },
  {
    id: "thumbnail",
    label: "サムネ用(YouTube) 1280×720",
    width: 1280,
    height: 720,
  },
  { id: "custom", label: "カスタム", width: 0, height: 0 },
] as const;

type PresetId = (typeof RESIZE_PRESETS)[number]["id"];
type FitMode = "cover" | "contain";

const OUTPUT_FORMATS = [
  { mimeType: "image/jpeg", label: "JPEG(圧縮向き)", extension: "jpg" },
  { mimeType: "image/webp", label: "WebP", extension: "webp" },
  { mimeType: "image/png", label: "PNG", extension: "png" },
] as const;

type OutputMimeType = (typeof OUTPUT_FORMATS)[number]["mimeType"];

/** 用途別プリセットつき画像リサイズ+圧縮ツール */
export function ImageResizeTool(): ReactElement {
  const [presetId, setPresetId] = useState<PresetId>("x-post");
  const [customWidth, setCustomWidth] = useState(800);
  const [customHeight, setCustomHeight] = useState(600);
  const [fitMode, setFitMode] = useState<FitMode>("cover");
  const [outputMimeType, setOutputMimeType] =
    useState<OutputMimeType>("image/jpeg");
  const [qualityPercent, setQualityPercent] = useState(85);
  const [items, setItems] = useState<DownloadItem[]>([]);
  const { isProcessing, errorMessage, run } = useAsyncTask();

  const selectedFormat =
    OUTPUT_FORMATS.find((format) => format.mimeType === outputMimeType) ??
    OUTPUT_FORMATS[0];

  const resolveTargetSize = (): { width: number; height: number } => {
    const preset = RESIZE_PRESETS.find(
      (candidate) => candidate.id === presetId,
    );
    if (preset === undefined || preset.id === "custom")
      return { width: customWidth, height: customHeight };
    return { width: preset.width, height: preset.height };
  };

  const handleFiles = (files: File[]): void => {
    run(async () => {
      const { width, height } = resolveTargetSize();
      if (
        !Number.isInteger(width) ||
        !Number.isInteger(height) ||
        width < 1 ||
        height < 1 ||
        width > 8192 ||
        height > 8192
      ) {
        throw new RangeError("出力サイズは 1〜8192px の整数で指定してください");
      }
      const results: DownloadItem[] = [];
      for (const file of files) {
        const image = await loadImageFromFile(file);
        const canvas = resizeToCanvas(
          image,
          width,
          height,
          fitMode,
          outputMimeType,
        );
        const blob = await canvasToBlob(
          canvas,
          outputMimeType,
          outputMimeType === "image/png" ? undefined : qualityPercent / 100,
        );
        results.push({
          fileName: `${baseName(file.name)}_${width}x${height}.${selectedFormat.extension}`,
          blob,
          note: `${width}×${height}px`,
        });
      }
      setItems(results);
    });
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm text-slate-700">
        <span className="mb-1 block font-medium">サイズプリセット</span>
        <select
          value={presetId}
          onChange={(event) => setPresetId(event.target.value as PresetId)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
        >
          {RESIZE_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>
      {presetId === "custom" && (
        <div className="flex items-center gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-1.5">
            幅
            <input
              type="number"
              min={1}
              max={8192}
              value={customWidth}
              onChange={(event) => setCustomWidth(Number(event.target.value))}
              className="w-24 rounded-lg border border-slate-300 px-2 py-1.5"
            />
          </label>
          ×
          <label className="flex items-center gap-1.5">
            高さ
            <input
              type="number"
              min={1}
              max={8192}
              value={customHeight}
              onChange={(event) => setCustomHeight(Number(event.target.value))}
              className="w-24 rounded-lg border border-slate-300 px-2 py-1.5"
            />
          </label>
          px
        </div>
      )}
      <fieldset className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
        <legend className="mb-2 text-sm font-medium">フィット方法</legend>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="resize-fit"
            checked={fitMode === "cover"}
            onChange={() => setFitMode("cover")}
            className="accent-sky-600"
          />
          全面に敷き詰める(はみ出しは中央トリミング)
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="resize-fit"
            checked={fitMode === "contain"}
            onChange={() => setFitMode("contain")}
            className="accent-sky-600"
          />
          全体を収める(余白を追加)
        </label>
      </fieldset>
      <fieldset className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
        <legend className="mb-2 text-sm font-medium">出力形式</legend>
        {OUTPUT_FORMATS.map((format) => (
          <label key={format.mimeType} className="flex items-center gap-1.5">
            <input
              type="radio"
              name="resize-format"
              checked={outputMimeType === format.mimeType}
              onChange={() => setOutputMimeType(format.mimeType)}
              className="accent-sky-600"
            />
            {format.label}
          </label>
        ))}
      </fieldset>
      {outputMimeType !== "image/png" && (
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
        processingLabel="リサイズ中…"
      />
      <DownloadList items={items} zipFileName="resized_images.zip" />
    </div>
  );
}

/** cover / contain でリサイズ描画する。JPEG など透過不可形式は白下地を敷く */
function resizeToCanvas(
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  fitMode: FitMode,
  outputMimeType: string,
): HTMLCanvasElement {
  const { canvas, context } = createCanvas(targetWidth, targetHeight);
  // JPEG は透過を持てないため常に白下地(contain の余白も白になる)
  if (outputMimeType === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, targetWidth, targetHeight);
  }
  const scaleRatio =
    fitMode === "cover"
      ? Math.max(
          targetWidth / image.naturalWidth,
          targetHeight / image.naturalHeight,
        )
      : Math.min(
          targetWidth / image.naturalWidth,
          targetHeight / image.naturalHeight,
        );
  const drawWidth = image.naturalWidth * scaleRatio;
  const drawHeight = image.naturalHeight * scaleRatio;
  context.drawImage(
    image,
    (targetWidth - drawWidth) / 2,
    (targetHeight - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
  return canvas;
}
