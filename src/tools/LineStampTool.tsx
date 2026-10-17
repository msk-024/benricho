import { useState } from "react";
import type { ReactElement } from "react";
import { DownloadList, type DownloadItem } from "../components/DownloadList";
import { FileDrop } from "../components/FileDrop";
import { LabeledSlider } from "../components/LabeledSlider";
import {
  StampPreviewGrid,
  type StampPreviewItem,
} from "../components/StampPreviewGrid";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import {
  drawImageToCanvas,
  getCanvasImageData,
  loadImageFromFile,
} from "../lib/canvas/canvasUtils";
import {
  MAX_STAMP_INDEX,
  MAX_STICKER_COUNT,
  renderStampSizeSet,
} from "../lib/canvas/stampExport";
import { detectContentCutoff } from "../lib/stampCutoffDetect";
import { bytesToBlob } from "../lib/download";
import { findOpaqueBounds, hasAnyTransparency } from "../lib/imageOps";
import { computeSizeRatio } from "../lib/stampSizeRatio";
import { isMainOrTabFile } from "../lib/stampNaming";

/**
 * LINEスタンプ用の3サイズ(本体370×320 / メイン240×240 / タブ96×74)を
 * 一括書き出しする。透過領域を検出して余白を保ちながら最大サイズにフィットさせ、
 * 出力PNGの実寸をIHDRレベルで厳密検証する。
 * メイン・タブ画像は選択した1枚からのみ書き出す(初期値は1番目、プレビューから変更可能)
 */
export function LineStampTool(): ReactElement {
  const [paddingPx, setPaddingPx] = useState(10);
  // 直近の書き出しで実際に使われた余白。メイン/タブの再生成は、スライダーの現在値ではなく
  // 必ずこの値を使い、同じセット内の本体画像とのフレーミングのズレを防ぐ
  const [exportPaddingPx, setExportPaddingPx] = useState(10);
  const [files, setFiles] = useState<File[]>([]);
  const [mainIndex, setMainIndex] = useState(0);
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [previewItems, setPreviewItems] = useState<StampPreviewItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const { isProcessing, errorMessage, run } = useAsyncTask();

  const handleFiles = (newFiles: File[]): void => {
    run(async () => {
      // 採番(01, 02, …)は buildStampFileName の仕様上 99 が上限のため、
      // 大量処理後に一部だけ失敗して結果を丸ごと失うことがないよう事前に弾く
      if (newFiles.length > MAX_STAMP_INDEX) {
        throw new RangeError(
          `一度に処理できるのは${MAX_STAMP_INDEX}枚までです(${newFiles.length}件が選択されています)`,
        );
      }
      setSuccessNote(null);
      const warningList: string[] = [];
      if (newFiles.length > MAX_STICKER_COUNT) {
        warningList.push(
          `LINEスタンプは最大${MAX_STICKER_COUNT}個です(${newFiles.length}件を処理しますが申請時にご注意ください)`,
        );
      }
      const downloadItems: DownloadItem[] = [];
      const newPreviewItems: StampPreviewItem[] = [];
      for (let fileIndex = 0; fileIndex < newFiles.length; fileIndex++) {
        const file = newFiles[fileIndex];
        const stampNumber = fileIndex + 1;
        const image = await loadImageFromFile(file);
        const sourceCanvas = drawImageToCanvas(image);
        const imageData = getCanvasImageData(sourceCanvas);
        if (!hasAnyTransparency(imageData)) {
          warningList.push(
            `${file.name}: 透過画素がありません。LINEの規定では背景透過が必須です(「背景透過」ツールを先にご利用ください)`,
          );
        }
        const contentBounds = findOpaqueBounds(imageData) ?? {
          x: 0,
          y: 0,
          width: imageData.width,
          height: imageData.height,
        };
        // 初期のメイン/タブ元ネタ(デフォルト1番目)は、ここでまとめて書き出す
        const kinds =
          fileIndex === 0
            ? (["sticker", "main", "tab"] as const)
            : (["sticker"] as const);
        const stampFiles = await renderStampSizeSet(
          sourceCanvas,
          contentBounds,
          paddingPx,
          stampNumber,
          kinds,
        );
        for (const stampFile of stampFiles) {
          const blob = bytesToBlob(stampFile.pngBytes, "image/png");
          downloadItems.push({
            fileName: stampFile.fileName,
            blob,
            note: stampFile.note,
          });
          if (stampFile.kind === "sticker") {
            newPreviewItems.push({
              id: `stamp-${stampNumber}`,
              stampNumber,
              blob,
              cutoff: detectContentCutoff(imageData, {
                x: 0,
                y: 0,
                width: imageData.width,
                height: imageData.height,
              }),
              sizeRatio: computeSizeRatio(stampFile.fitRect, 370, 320),
            });
          }
        }
      }
      setFiles(newFiles);
      setMainIndex(0);
      setItems(downloadItems);
      setPreviewItems(newPreviewItems);
      setWarnings(warningList);
      setExportPaddingPx(paddingPx);
      setSuccessNote(
        `${newFiles.length}枚 × 3サイズ = ${downloadItems.length}ファイルを書き出し、全出力の実寸検証に合格しました`,
      );
    });
  };

  const handleSelectMain = (index: number): void => {
    if (index === mainIndex || files[index] === undefined) return;
    run(async () => {
      const file = files[index];
      const image = await loadImageFromFile(file);
      const sourceCanvas = drawImageToCanvas(image);
      const imageData = getCanvasImageData(sourceCanvas);
      const contentBounds = findOpaqueBounds(imageData) ?? {
        x: 0,
        y: 0,
        width: imageData.width,
        height: imageData.height,
      };
      const mainTabFiles = await renderStampSizeSet(
        sourceCanvas,
        contentBounds,
        exportPaddingPx,
        index + 1,
        ["main", "tab"],
      );
      const mainTabItems = mainTabFiles.map((stampFile) => ({
        fileName: stampFile.fileName,
        blob: bytesToBlob(stampFile.pngBytes, "image/png"),
        note: stampFile.note,
      }));
      setItems((prev) => [
        ...prev.filter((item) => !isMainOrTabFile(item.fileName)),
        ...mainTabItems,
      ]);
      setMainIndex(index);
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p>
          各イラストから以下のファイルを書き出します(連番は選択順・ZIP一括アップロード用の命名):
        </p>
        <ul className="mt-1 list-inside list-disc">
          <li>01.png〜 — 本体 370×320px(全イラスト分)</li>
          <li>main.png — メイン画像 240×240px(選んだ1枚のみ)</li>
          <li>tab.png — タブ画像 96×74px(選んだ1枚のみ)</li>
        </ul>
      </div>
      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p className="font-semibold text-slate-700">
          元イラストを描くときのお願い
        </p>
        <ul className="mt-1 list-inside list-disc">
          <li>元画像は横370px×縦320px以上で描くと、きれいに書き出せます</li>
          <li>
            横長・縦長すぎる絵は、トーク画面で小さく見えます。370:320に近い比率がおすすめです
          </li>
          <li>
            外枠との余白(約10px)は書き出し時に自動でつけるので、描くときは気にしなくて大丈夫です
          </li>
        </ul>
      </div>
      <LabeledSlider
        label="キャンバス端の余白"
        min={0}
        max={20}
        step={1}
        value={paddingPx}
        unit="px"
        disabled={isProcessing}
        onChange={setPaddingPx}
      />
      <FileDrop
        accept="image/png,image/webp"
        multiple
        disabled={isProcessing}
        description="背景透過済みPNG(複数可・最大40枚)。選択順に 01, 02, … と採番します"
        onFiles={handleFiles}
      />
      <ToolStatus
        isProcessing={isProcessing}
        errorMessage={errorMessage}
        processingLabel="書き出し中…"
      />
      {warnings.length > 0 && (
        <ul className="space-y-1 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warnings.map((warning) => (
            <li key={warning}>⚠ {warning}</li>
          ))}
        </ul>
      )}
      {successNote !== null && !isProcessing && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✓ {successNote}
        </p>
      )}
      <StampPreviewGrid
        items={previewItems}
        mainIndex={mainIndex}
        onSelectMain={handleSelectMain}
        disabled={isProcessing}
      />
      <DownloadList items={items} zipFileName="line_stamp_images.zip" />
    </div>
  );
}
