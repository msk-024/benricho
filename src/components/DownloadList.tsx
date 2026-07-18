import { useState } from "react";
import type { ReactElement } from "react";
import { toErrorMessage } from "../hooks/useAsyncTask";
import { blobToBytes } from "../lib/canvas/canvasUtils";
import { bytesToBlob, downloadBlob } from "../lib/download";
import { formatBytes } from "../lib/fileName";
import { createZip, type ZipEntry } from "../lib/zip";

export interface DownloadItem {
  fileName: string;
  blob: Blob;
  note?: string;
}

interface DownloadListProps {
  items: readonly DownloadItem[];
  /** 指定すると「まとめてZIP」ボタンを表示する(2件以上のとき) */
  zipFileName?: string;
}

/** 変換結果のファイル一覧と個別 / 一括ダウンロードボタン */
export function DownloadList({
  items,
  zipFileName,
}: DownloadListProps): ReactElement | null {
  const [zipError, setZipError] = useState<string | null>(null);
  if (items.length === 0) return null;

  const handleZipDownload = (): void => {
    void (async () => {
      try {
        const entries: ZipEntry[] = [];
        for (const item of items) {
          entries.push({
            name: item.fileName,
            data: await blobToBytes(item.blob),
          });
        }
        downloadBlob(
          bytesToBlob(createZip(entries), "application/zip"),
          zipFileName ?? "files.zip",
        );
        setZipError(null);
      } catch (error: unknown) {
        setZipError(toErrorMessage(error));
      }
    })();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          変換結果({items.length}件)
        </h3>
        {zipFileName !== undefined && items.length > 1 && (
          <button
            type="button"
            onClick={handleZipDownload}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            まとめてZIPダウンロード
          </button>
        )}
      </div>
      {zipError !== null && (
        <p className="text-sm text-red-600">⚠ {zipError}</p>
      )}
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {items.map((item) => (
          <li
            key={item.fileName}
            className="flex items-center justify-between gap-3 px-4 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">
                {item.fileName}
              </p>
              <p className="text-xs text-slate-500">
                {formatBytes(item.blob.size)}
                {item.note !== undefined && ` ・ ${item.note}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadBlob(item.blob, item.fileName)}
              className="shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
            >
              ダウンロード
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
