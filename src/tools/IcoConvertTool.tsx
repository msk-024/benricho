import { useState } from "react";
import type { ReactElement } from "react";
import { DownloadList, type DownloadItem } from "../components/DownloadList";
import { FileDrop } from "../components/FileDrop";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import {
  canvasToPngBytes,
  createCanvas,
  loadImageFromFile,
} from "../lib/canvas/canvasUtils";
import { bytesToBlob } from "../lib/download";
import { replaceExtension } from "../lib/fileName";
import { encodeIco, type IcoEntryInput } from "../lib/icoEncoder";

const SELECTABLE_SIZES = [16, 32, 48, 64, 128, 256] as const;

/** 画像を複数サイズ内包の ICO ファイルに変換する */
export function IcoConvertTool(): ReactElement {
  const [selectedSizes, setSelectedSizes] = useState<ReadonlySet<number>>(
    new Set([16, 32, 48]),
  );
  const [items, setItems] = useState<DownloadItem[]>([]);
  const { isProcessing, errorMessage, run } = useAsyncTask();

  const toggleSize = (size: number): void => {
    setSelectedSizes((current) => {
      const next = new Set(current);
      if (next.has(size)) next.delete(size);
      else next.add(size);
      return next;
    });
  };

  const handleFiles = (files: File[]): void => {
    run(async () => {
      if (selectedSizes.size === 0)
        throw new RangeError("サイズを1つ以上選択してください");
      const sizes = SELECTABLE_SIZES.filter((size) => selectedSizes.has(size));
      const results: DownloadItem[] = [];
      for (const file of files) {
        const image = await loadImageFromFile(file);
        const entries: IcoEntryInput[] = [];
        for (const size of sizes) {
          const { canvas, context } = createCanvas(size, size);
          const scaleRatio = Math.min(
            size / image.naturalWidth,
            size / image.naturalHeight,
          );
          const drawWidth = image.naturalWidth * scaleRatio;
          const drawHeight = image.naturalHeight * scaleRatio;
          context.drawImage(
            image,
            (size - drawWidth) / 2,
            (size - drawHeight) / 2,
            drawWidth,
            drawHeight,
          );
          entries.push({
            width: size,
            height: size,
            pngBytes: await canvasToPngBytes(canvas),
          });
        }
        results.push({
          fileName: replaceExtension(file.name, "ico"),
          blob: bytesToBlob(encodeIco(entries), "image/x-icon"),
          note: `${sizes.map((size) => `${size}px`).join(" / ")} を内包`,
        });
      }
      setItems(results);
    });
  };

  return (
    <div className="space-y-4">
      <fieldset className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
        <legend className="mb-2 text-sm font-medium">内包するサイズ</legend>
        {SELECTABLE_SIZES.map((size) => (
          <label key={size} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={selectedSizes.has(size)}
              onChange={() => toggleSize(size)}
              className="accent-sky-600"
            />
            {size}px
          </label>
        ))}
      </fieldset>
      <FileDrop
        accept="image/png,image/jpeg,image/webp"
        multiple
        disabled={isProcessing}
        description="PNG / JPG(複数可)。正方形画像を推奨"
        onFiles={handleFiles}
      />
      <ToolStatus
        isProcessing={isProcessing}
        errorMessage={errorMessage}
        processingLabel="ICOを生成中…"
      />
      <DownloadList items={items} zipFileName="ico_files.zip" />
    </div>
  );
}
