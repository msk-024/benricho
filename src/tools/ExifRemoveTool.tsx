import { useState } from "react";
import type { ReactElement } from "react";
import { DownloadList, type DownloadItem } from "../components/DownloadList";
import { FileDrop } from "../components/FileDrop";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import { bytesToBlob } from "../lib/download";
import { appendSuffix, formatBytes } from "../lib/fileName";
import { isJpeg, stripJpegMetadata } from "../lib/jpegSegments";
import { stripPngMetadata } from "../lib/pngChunks";
import { isPng } from "../lib/pngParse";

/**
 * EXIF等のメタデータをロスレス削除する。
 * 再エンコードせずセグメント/チャンク単位で除去するため画質は一切変わらない
 */
export function ExifRemoveTool(): ReactElement {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const { isProcessing, errorMessage, run } = useAsyncTask();

  const handleFiles = (files: File[]): void => {
    run(async () => {
      const results: DownloadItem[] = [];
      for (const file of files) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const stripped = stripImageMetadata(bytes, file.name);
        const removedNote =
          stripped.removedList.length > 0
            ? `削除: ${stripped.removedList.join(", ")}`
            : "削除対象のメタデータはありませんでした";
        results.push({
          fileName: appendSuffix(file.name, "_noexif"),
          blob: bytesToBlob(stripped.bytes, stripped.mimeType),
          note: `${formatBytes(bytes.length)} → ${formatBytes(stripped.bytes.length)} ・ ${removedNote}`,
        });
      }
      setItems(results);
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        撮影日時・位置情報(GPS)・カメラ機種などのメタデータを、画質を落とさず削除します。
      </p>
      <FileDrop
        accept="image/jpeg,image/png"
        multiple
        disabled={isProcessing}
        description="JPG / PNG(複数可)"
        onFiles={handleFiles}
      />
      <ToolStatus
        isProcessing={isProcessing}
        errorMessage={errorMessage}
        processingLabel="メタデータを削除中…"
      />
      <DownloadList items={items} zipFileName="noexif_images.zip" />
    </div>
  );
}

interface StripOutcome {
  bytes: Uint8Array;
  removedList: string[];
  mimeType: string;
}

function stripImageMetadata(bytes: Uint8Array, fileName: string): StripOutcome {
  if (isJpeg(bytes)) {
    const result = stripJpegMetadata(bytes);
    return {
      bytes: result.bytes,
      removedList: result.removedSegments,
      mimeType: "image/jpeg",
    };
  }
  if (isPng(bytes)) {
    const result = stripPngMetadata(bytes);
    return {
      bytes: result.bytes,
      removedList: result.removedChunkTypes,
      mimeType: "image/png",
    };
  }
  throw new Error(`対応形式は JPEG / PNG です: ${fileName}`);
}
