import { useState } from "react";
import type { ReactElement } from "react";
import { DownloadList, type DownloadItem } from "../components/DownloadList";
import { FileDrop } from "../components/FileDrop";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import { bytesToBlob } from "../lib/download";
import { baseName } from "../lib/fileName";
import { parsePageRanges } from "../lib/pageRanges";
import {
  extractPdfPages,
  getPdfPageCount,
  splitPdfToSinglePages,
} from "../lib/pdfOps";

type SplitMode = "all" | "range";

/** PDF の分割(1ページずつ)とページ範囲抽出 */
export function PdfSplitTool(): ReactElement {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [splitMode, setSplitMode] = useState<SplitMode>("range");
  const [rangeText, setRangeText] = useState("");
  const [items, setItems] = useState<DownloadItem[]>([]);
  const { isProcessing, errorMessage, run } = useAsyncTask();

  const handleFiles = (files: File[]): void => {
    const file = files[0];
    run(async () => {
      const count = await getPdfPageCount(
        new Uint8Array(await file.arrayBuffer()),
      );
      setSelectedFile(file);
      setPageCount(count);
      setItems([]);
    });
  };

  const handleExecute = (): void => {
    run(async () => {
      if (selectedFile === null || pageCount === null) {
        throw new Error("先にPDFファイルを選択してください");
      }
      const bytes = new Uint8Array(await selectedFile.arrayBuffer());
      const outputBase = baseName(selectedFile.name);
      if (splitMode === "all") {
        const parts = await splitPdfToSinglePages(bytes);
        const padWidth = String(parts.length).length;
        setItems(
          parts.map((partBytes, index) => ({
            fileName: `${outputBase}_p${String(index + 1).padStart(padWidth, "0")}.pdf`,
            blob: bytesToBlob(partBytes, "application/pdf"),
            note: `${index + 1}ページ目`,
          })),
        );
        return;
      }
      const pageNumbers = parsePageRanges(rangeText, pageCount);
      const extractedBytes = await extractPdfPages(bytes, pageNumbers);
      setItems([
        {
          fileName: `${outputBase}_extract.pdf`,
          blob: bytesToBlob(extractedBytes, "application/pdf"),
          note: `${pageNumbers.length}ページを抽出(${rangeText.trim()})`,
        },
      ]);
    });
  };

  return (
    <div className="space-y-4">
      <FileDrop
        accept="application/pdf,.pdf"
        disabled={isProcessing}
        description="PDFファイル(1ファイル)"
        onFiles={handleFiles}
      />
      {selectedFile !== null && pageCount !== null && (
        <p className="rounded-lg bg-surface-muted px-4 py-2.5 text-sm text-ink">
          {selectedFile.name}(全{pageCount}ページ)
        </p>
      )}
      <fieldset className="space-y-2 text-sm text-ink">
        <legend className="mb-1 text-sm font-medium">処理内容</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="split-mode"
            checked={splitMode === "range"}
            onChange={() => setSplitMode("range")}
            className="accent-action-primary"
          />
          ページ範囲を抽出して1つのPDFにする
        </label>
        {splitMode === "range" && (
          <input
            type="text"
            value={rangeText}
            onChange={(event) => setRangeText(event.target.value)}
            placeholder="例: 1-3,5,8-10"
            className="ml-6 w-64 rounded-lg border border-line-strong px-3 py-1.5 font-mono"
          />
        )}
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="split-mode"
            checked={splitMode === "all"}
            onChange={() => setSplitMode("all")}
            className="accent-action-primary"
          />
          全ページを1ページずつのPDFに分割する
        </label>
      </fieldset>
      <button
        type="button"
        disabled={
          isProcessing ||
          selectedFile === null ||
          (splitMode === "range" && rangeText.trim() === "")
        }
        onClick={handleExecute}
        className="rounded-lg bg-action-primary px-4 py-2 text-sm font-medium text-ink-inverted hover:bg-action-primary-hover disabled:opacity-50"
      >
        実行
      </button>
      <ToolStatus
        isProcessing={isProcessing}
        errorMessage={errorMessage}
        processingLabel="処理中…"
      />
      <DownloadList
        items={items}
        zipFileName={
          selectedFile !== null
            ? `${baseName(selectedFile.name)}_pages.zip`
            : undefined
        }
      />
    </div>
  );
}
