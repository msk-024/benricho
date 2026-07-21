import { useState } from "react";
import type { ReactElement } from "react";
import { toErrorMessage } from "../hooks/useAsyncTask";
import { blobToBytes } from "../lib/canvas/canvasUtils";
import { bytesToBlob, downloadBlob } from "../lib/download";
import { dedupeFileNames, formatBytes } from "../lib/fileName";
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
  const [isZipping, setIsZipping] = useState(false);
  if (items.length === 0) return null;

  const handleZipDownload = (): void => {
    if (isZipping) return;
    setIsZipping(true);
    void (async () => {
      try {
        // 同名(大文字小文字違い含む)ファイルが混在するとZIP格納時に衝突するため、
        // ダウンロード直前に一意なファイル名へ振り直す
        const uniqueNames = dedupeFileNames(items.map((item) => item.fileName));
        const entries: ZipEntry[] = await Promise.all(
          items.map(async (item, index) => ({
            name: uniqueNames[index],
            data: await blobToBytes(item.blob),
          })),
        );
        downloadBlob(
          bytesToBlob(createZip(entries), "application/zip"),
          zipFileName ?? "files.zip",
        );
        setZipError(null);
      } catch (error: unknown) {
        setZipError(toErrorMessage(error));
      } finally {
        setIsZipping(false);
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
            disabled={isZipping}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isZipping ? "ZIPを作成中…" : "まとめてZIPダウンロード"}
          </button>
        )}
      </div>
      {zipError !== null && (
        <p className="text-sm text-red-600">⚠ {zipError}</p>
      )}
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {items.map((item, index) => (
          <li
            key={`${index}-${item.fileName}`}
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
