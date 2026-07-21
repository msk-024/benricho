import { useState } from "react";
import type { ReactElement } from "react";
import { CopyButton } from "../components/CopyButton";
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
import { computeFitRect } from "../lib/fitRect";
import { encodeIco, type IcoEntryInput } from "../lib/icoEncoder";

const FAVICON_PNG_SET = [
  { size: 16, fileName: "favicon-16.png" },
  { size: 32, fileName: "favicon-32.png" },
  { size: 48, fileName: "favicon-48.png" },
  { size: 180, fileName: "apple-touch-icon.png" },
  { size: 192, fileName: "icon-192.png" },
  { size: 512, fileName: "icon-512.png" },
] as const;

const ICO_EMBED_SIZES = [16, 32, 48] as const;

const HTML_SNIPPET = `<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" type="image/png" href="/favicon-32.png" sizes="32x32">
<link rel="icon" type="image/png" href="/icon-192.png" sizes="192x192">
<link rel="icon" type="image/png" href="/icon-512.png" sizes="512x512">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">`;

/** ファビコン一式(複数サイズPNG + favicon.ico)を一括生成する */
export function FaviconTool(): ReactElement {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [sourceNote, setSourceNote] = useState<string | null>(null);
  const { isProcessing, errorMessage, run } = useAsyncTask();

  const handleFiles = (files: File[]): void => {
    const file = files[0];
    run(async () => {
      const image = await loadImageFromFile(file);
      const notes: string[] = [];
      if (image.naturalWidth !== image.naturalHeight) {
        notes.push(
          "元画像が正方形でないため、透明の余白を足して正方形化しました",
        );
      }
      if (Math.max(image.naturalWidth, image.naturalHeight) < 512) {
        notes.push(
          "元画像が512px未満のため、大きいサイズは拡大により粗くなります",
        );
      }

      const pngBytesBySize = new Map<number, Uint8Array>();
      const results: DownloadItem[] = [];
      for (const { size, fileName } of FAVICON_PNG_SET) {
        const bytes = await canvasToPngBytes(renderSquareIcon(image, size));
        pngBytesBySize.set(size, bytes);
        results.push({
          fileName,
          blob: bytesToBlob(bytes, "image/png"),
          note: `${size}×${size}px`,
        });
      }

      const icoEntries: IcoEntryInput[] = ICO_EMBED_SIZES.map((size) => {
        const pngBytes = pngBytesBySize.get(size);
        if (pngBytes === undefined)
          throw new Error(`ICO用の${size}px画像の生成に失敗しました`);
        return { width: size, height: size, pngBytes };
      });
      results.push({
        fileName: "favicon.ico",
        blob: bytesToBlob(encodeIco(icoEntries), "image/x-icon"),
        note: "16/32/48px を内包",
      });

      setItems(results);
      setSourceNote(notes.length > 0 ? notes.join("。") : null);
    });
  };

  return (
    <div className="space-y-4">
      <FileDrop
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        disabled={isProcessing}
        description="正方形・512px以上のPNG推奨(1ファイル)"
        onFiles={handleFiles}
      />
      <ToolStatus
        isProcessing={isProcessing}
        errorMessage={errorMessage}
        processingLabel="ファビコンを生成中…"
      />
      {sourceNote !== null && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ℹ {sourceNote}
        </p>
      )}
      <DownloadList items={items} zipFileName="favicon_set.zip" />
      {items.length > 0 && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              HTMLに貼り付けるスニペット
            </h3>
            <CopyButton text={HTML_SNIPPET} />
          </div>
          <pre className="overflow-x-auto rounded bg-slate-50 p-3 text-xs text-slate-700">
            {HTML_SNIPPET}
          </pre>
        </div>
      )}
    </div>
  );
}

/** 正方形キャンバスに contain 配置で描画する(不足分は透明余白) */
function renderSquareIcon(
  image: HTMLImageElement,
  size: number,
): HTMLCanvasElement {
  const { canvas, context } = createCanvas(size, size);
  const rect = computeFitRect(
    image.naturalWidth,
    image.naturalHeight,
    size,
    size,
    0,
  );
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  return canvas;
}
