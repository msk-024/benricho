import { useState } from "react";
import type { ReactElement } from "react";
import { DownloadList, type DownloadItem } from "../components/DownloadList";
import { FileDrop } from "../components/FileDrop";
import { FileOrderList } from "../components/FileOrderList";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import {
  canvasToPngBytes,
  drawImageToCanvas,
  loadImageFromFile,
} from "../lib/canvas/canvasUtils";
import { bytesToBlob } from "../lib/download";
import { imagesToPdf, type EmbeddableImage } from "../lib/pdfOps";

/** 複数の画像を 1 つの PDF にまとめる(1画像=1ページ、実寸) */
export function ImageToPdfTool(): ReactElement {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [items, setItems] = useState<DownloadItem[]>([]);
  const { isProcessing, errorMessage, run } = useAsyncTask();

  const handleAddFiles = (files: File[]): void => {
    setSelectedFiles((current) => [...current, ...files]);
    setItems([]);
  };

  const handleMove = (index: number, direction: -1 | 1): void => {
    setSelectedFiles((current) => {
      const next = [...current];
      const target = next[index];
      next[index] = next[index + direction];
      next[index + direction] = target;
      return next;
    });
  };

  const handleRemove = (index: number): void => {
    setSelectedFiles((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const handleConvert = (): void => {
    run(async () => {
      const images: EmbeddableImage[] = [];
      for (const file of selectedFiles) {
        images.push(await toEmbeddableImage(file));
      }
      const pdfBytes = await imagesToPdf(images);
      setItems([
        {
          fileName: "images.pdf",
          blob: bytesToBlob(pdfBytes, "application/pdf"),
          note: `全${images.length}ページ(1画像=1ページ)`,
        },
      ]);
    });
  };

  return (
    <div className="space-y-4">
      <FileDrop
        accept="image/png,image/jpeg,image/webp"
        multiple
        disabled={isProcessing}
        description="PNG / JPG / WebP(複数可)。追加した順がページ順になります"
        onFiles={handleAddFiles}
      />
      <FileOrderList
        files={selectedFiles}
        disabled={isProcessing}
        onMove={handleMove}
        onRemove={handleRemove}
      />
      <button
        type="button"
        disabled={isProcessing || selectedFiles.length === 0}
        onClick={handleConvert}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
      >
        1つのPDFにまとめる
      </button>
      <ToolStatus
        isProcessing={isProcessing}
        errorMessage={errorMessage}
        processingLabel="PDFを生成中…"
      />
      <DownloadList items={items} />
    </div>
  );
}

/** PNG/JPEG はそのまま、その他の画像形式は PNG に変換して PDF 埋め込み可能にする */
async function toEmbeddableImage(file: File): Promise<EmbeddableImage> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type === "image/png") return { bytes, kind: "png" };
  if (file.type === "image/jpeg") return { bytes, kind: "jpeg" };
  const image = await loadImageFromFile(file);
  return {
    bytes: await canvasToPngBytes(drawImageToCanvas(image)),
    kind: "png",
  };
}
