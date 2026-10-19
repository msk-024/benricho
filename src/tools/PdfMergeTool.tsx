import { useState } from "react";
import type { ReactElement } from "react";
import { DownloadList, type DownloadItem } from "../components/DownloadList";
import { FileDrop } from "../components/FileDrop";
import { FileOrderList } from "../components/FileOrderList";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import { bytesToBlob } from "../lib/download";
import { getPdfPageCount, mergePdfs } from "../lib/pdfOps";

/** 複数の PDF を指定順に 1 つへ結合する */
export function PdfMergeTool(): ReactElement {
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

  const handleMerge = (): void => {
    run(async () => {
      const bytesList: Uint8Array[] = [];
      for (const file of selectedFiles) {
        bytesList.push(new Uint8Array(await file.arrayBuffer()));
      }
      const mergedBytes = await mergePdfs(bytesList);
      const pageCount = await getPdfPageCount(mergedBytes);
      setItems([
        {
          fileName: "merged.pdf",
          blob: bytesToBlob(mergedBytes, "application/pdf"),
          note: `${selectedFiles.length}ファイル・全${pageCount}ページ`,
        },
      ]);
    });
  };

  return (
    <div className="space-y-4">
      <FileDrop
        accept="application/pdf,.pdf"
        multiple
        disabled={isProcessing}
        description="PDFファイル(複数可)。追加した順に下の一覧へ並びます"
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
        disabled={isProcessing || selectedFiles.length < 2}
        onClick={handleMerge}
        className="rounded-lg bg-action-primary px-4 py-2 text-sm font-medium text-ink-inverted hover:bg-action-primary-hover disabled:opacity-50"
      >
        この順番で結合する
      </button>
      <ToolStatus
        isProcessing={isProcessing}
        errorMessage={errorMessage}
        processingLabel="結合中…"
      />
      <DownloadList items={items} />
    </div>
  );
}
