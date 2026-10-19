import { useState } from "react";
import type { ReactElement } from "react";
import { DownloadList, type DownloadItem } from "../components/DownloadList";
import { FileDrop } from "../components/FileDrop";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import { compressPdfByRasterize } from "../lib/canvas/pdfCompress";
import { appendSuffix, formatBytes } from "../lib/fileName";

const COMPRESS_PRESETS = [
  {
    id: "light",
    label: "高画質(圧縮ひかえめ)",
    renderScale: 1.5,
    jpegQuality: 0.8,
  },
  { id: "standard", label: "標準", renderScale: 1.2, jpegQuality: 0.65 },
  {
    id: "strong",
    label: "強圧縮(画質低め)",
    renderScale: 1.0,
    jpegQuality: 0.5,
  },
] as const;

type PresetId = (typeof COMPRESS_PRESETS)[number]["id"];

/** PDF を再ラスタライズ方式で圧縮する */
export function PdfCompressTool(): ReactElement {
  const [presetId, setPresetId] = useState<PresetId>("standard");
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [resultNote, setResultNote] = useState<string | null>(null);
  const { isProcessing, errorMessage, run } = useAsyncTask();

  const handleFiles = (files: File[]): void => {
    const file = files[0];
    run(async () => {
      setResultNote(null);
      const preset =
        COMPRESS_PRESETS.find((candidate) => candidate.id === presetId) ??
        COMPRESS_PRESETS[1];
      const sourceBytes = new Uint8Array(await file.arrayBuffer());
      const compressedBlob = await compressPdfByRasterize(sourceBytes, {
        renderScale: preset.renderScale,
        jpegQuality: preset.jpegQuality,
      });
      const ratioPercent = Math.round(
        (compressedBlob.size / sourceBytes.length) * 100,
      );
      setItems([
        {
          fileName: appendSuffix(file.name, "_compressed"),
          blob: compressedBlob,
          note: `${formatBytes(sourceBytes.length)} → ${formatBytes(compressedBlob.size)}(${ratioPercent}%)`,
        },
      ]);
      if (compressedBlob.size >= sourceBytes.length) {
        setResultNote(
          "圧縮後の方が大きくなりました。元PDFが既に十分小さいか、テキスト中心のPDFです(この方式は画像中心のPDF向きです)",
        );
      }
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        各ページを画像として描き直すことでサイズを削減します。
        <span className="font-medium">
          テキストの選択・検索はできなくなります
        </span>
        のでご注意ください。
      </p>
      <fieldset className="flex flex-wrap items-center gap-4 text-sm text-ink">
        <legend className="mb-2 text-sm font-medium">圧縮レベル</legend>
        {COMPRESS_PRESETS.map((preset) => (
          <label key={preset.id} className="flex items-center gap-1.5">
            <input
              type="radio"
              name="compress-preset"
              checked={presetId === preset.id}
              onChange={() => setPresetId(preset.id)}
              className="accent-action-primary"
            />
            {preset.label}
          </label>
        ))}
      </fieldset>
      <FileDrop
        accept="application/pdf,.pdf"
        disabled={isProcessing}
        description="PDFファイル(1ファイル)"
        onFiles={handleFiles}
      />
      <ToolStatus
        isProcessing={isProcessing}
        errorMessage={errorMessage}
        processingLabel="圧縮中…(ページ数によって時間がかかります)"
      />
      {resultNote !== null && (
        <p className="rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn-ink">
          ℹ {resultNote}
        </p>
      )}
      <DownloadList items={items} />
    </div>
  );
}
