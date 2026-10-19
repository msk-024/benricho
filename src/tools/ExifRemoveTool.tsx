import { useState } from "react";
import type { ReactElement } from "react";
import { DownloadList, type DownloadItem } from "../components/DownloadList";
import { FileDrop } from "../components/FileDrop";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import {
  canvasToBlob,
  drawImageToCanvas,
  loadImageFromFile,
} from "../lib/canvas/canvasUtils";
import { bytesToBlob } from "../lib/download";
import { appendSuffix, formatBytes } from "../lib/fileName";
import { readJpegOrientation } from "../lib/jpegExifOrientation";
import { isJpeg, stripJpegMetadata } from "../lib/jpegSegments";
import { stripPngMetadata } from "../lib/pngChunks";
import { isPng } from "../lib/pngParse";

/** 回転情報を反映するための再エンコード時のJPEG品質(劣化をできるだけ抑える) */
const REENCODE_JPEG_QUALITY = 0.95;

/**
 * EXIF等のメタデータを削除する。
 * 通常はセグメント/チャンク単位でロスレス削除する。JPEGでExif
 * Orientation(回転情報)が「回転あり」を示している場合のみ、削除前に
 * ブラウザのデコード結果(自動的に正しい向きになる)をcanvasへ焼き込んで
 * 再エンコードする(このケースのみ画質にわずかな影響がある)
 */
export function ExifRemoveTool(): ReactElement {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const { isProcessing, errorMessage, run } = useAsyncTask();

  const handleFiles = (files: File[]): void => {
    run(async () => {
      const results: DownloadItem[] = [];
      for (const file of files) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const stripped = await stripImageMetadata(file, bytes);
        const removedNote =
          stripped.removedList.length > 0
            ? `削除: ${stripped.removedList.join(", ")}`
            : "削除対象のメタデータはありませんでした";
        const qualityNote = stripped.reencoded
          ? " ・ 回転情報を反映するため再エンコードしました(画質にわずかな影響があります)"
          : " ・ ロスレス(画質は一切変わりません)";
        results.push({
          fileName: appendSuffix(file.name, "_noexif"),
          blob: bytesToBlob(stripped.bytes, stripped.mimeType),
          note: `${formatBytes(bytes.length)} → ${formatBytes(stripped.bytes.length)} ・ ${removedNote}${qualityNote}`,
        });
      }
      setItems(results);
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        撮影日時・位置情報(GPS)・カメラ機種などのメタデータを削除します。
        通常は画質を落としません(JPEGで回転情報の焼き込みが必要な場合のみ、その写真だけ再エンコードします)。
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
  reencoded: boolean;
}

/**
 * JPEGの再エンコード(回転の焼き込み)が必要かどうかを判定する純粋関数。
 * Exif Orientationが「回転なし」以外を示している場合のみ再エンコードが要る
 */
function needsJpegReencode(bytes: Uint8Array): boolean {
  return readJpegOrientation(bytes) !== 1;
}

async function stripImageMetadata(
  file: File,
  bytes: Uint8Array,
): Promise<StripOutcome> {
  if (isJpeg(bytes)) {
    if (!needsJpegReencode(bytes)) {
      const result = stripJpegMetadata(bytes);
      return {
        bytes: result.bytes,
        removedList: result.removedSegments,
        mimeType: "image/jpeg",
        reencoded: false,
      };
    }
    // Orientationが回転ありを示している場合のみ、ブラウザのデコード結果
    // (image-orientation: from-image により自動で正しい向きになる)をcanvasへ
    // 焼き込んでから再エンコードする。ここで自前にrotateはしない(二重回転になるため)。
    // ロスレス経路なら保持するICCプロファイル等も、再エンコードでは失われる
    const losslessPreview = stripJpegMetadata(bytes);
    const image = await loadImageFromFile(file);
    const canvas = drawImageToCanvas(image);
    const blob = await canvasToBlob(
      canvas,
      "image/jpeg",
      REENCODE_JPEG_QUALITY,
    );
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      removedList: [
        ...losslessPreview.removedSegments,
        "ICCプロファイル等の色情報(再エンコードのため)",
      ],
      mimeType: "image/jpeg",
      reencoded: true,
    };
  }
  if (isPng(bytes)) {
    const result = stripPngMetadata(bytes);
    return {
      bytes: result.bytes,
      removedList: result.removedChunkTypes,
      mimeType: "image/png",
      reencoded: false,
    };
  }
  throw new Error(`対応形式は JPEG / PNG です: ${file.name}`);
}
