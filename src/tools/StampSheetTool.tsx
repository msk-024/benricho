import { useState } from "react";
import type { ReactElement } from "react";
import { DownloadList, type DownloadItem } from "../components/DownloadList";
import { FileDrop } from "../components/FileDrop";
import { LabeledSlider } from "../components/LabeledSlider";
import { StampFrameList } from "../components/StampFrameList";
import { StampFrameOverlay } from "../components/StampFrameOverlay";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import {
  cropCanvas,
  drawImageToCanvas,
  getCanvasImageData,
  imageDataToCanvas,
  loadImageFromFile,
} from "../lib/canvas/canvasUtils";
import {
  MAX_STAMP_INDEX,
  MAX_STICKER_COUNT,
  renderStampSizeSet,
} from "../lib/canvas/stampExport";
import { bytesToBlob } from "../lib/download";
import {
  findOpaqueBounds,
  hasAnyTransparency,
  removeBackgroundByFloodFill,
  transparentPixelRatio,
  unionPixelRect,
  type PixelRect,
} from "../lib/imageOps";
import { createStampFrameId, type StampFrame } from "../lib/stampFrame";
import {
  detectStampSheetRegions,
  STAMP_SHEET_DETECTION_DEFAULTS,
  type DetectStampSheetRegionsOptions,
} from "../lib/stampSheetDetect";

/** 透過画素の割合がこれ未満なら「実質未透過」とみなし、背景透過を促す */
const OPAQUE_WARNING_RATIO = 0.01;

function toStampFrames(
  canvas: HTMLCanvasElement,
  options: DetectStampSheetRegionsOptions,
): StampFrame[] {
  const imageData = getCanvasImageData(canvas);
  return detectStampSheetRegions(imageData, options).map((region) => ({
    ...region,
  }));
}

/**
 * シート画像から複数のスタンプイラストを自動検出し、枠を調整した上で
 * 既存のLINEスタンプ書き出しフロー(本体/メイン/タブの3サイズ)へ接続するツール。
 */
export function StampSheetTool(): ReactElement {
  const [sheetCanvas, setSheetCanvas] = useState<HTMLCanvasElement | null>(
    null,
  );
  const [transparentRatio, setTransparentRatio] = useState(1);
  const [bgRemovalTolerance, setBgRemovalTolerance] = useState(30);
  const [alphaThreshold, setAlphaThreshold] = useState<number>(
    STAMP_SHEET_DETECTION_DEFAULTS.alphaThreshold,
  );
  const [minArea, setMinArea] = useState<number>(
    STAMP_SHEET_DETECTION_DEFAULTS.minArea,
  );
  const [mergeDistance, setMergeDistance] = useState<number>(
    STAMP_SHEET_DETECTION_DEFAULTS.mergeDistance,
  );
  const [frames, setFrames] = useState<StampFrame[]>([]);
  const [hasManualEdits, setHasManualEdits] = useState(false);
  const [selectedFrameIds, setSelectedFrameIds] = useState<Set<string>>(
    new Set(),
  );
  const [paddingPx, setPaddingPx] = useState(10);
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const { isProcessing, errorMessage, run } = useAsyncTask();

  const looksOpaque = transparentRatio < OPAQUE_WARNING_RATIO;
  const detectionOptions: DetectStampSheetRegionsOptions = {
    alphaThreshold,
    minArea,
    mergeDistance,
  };

  const resetResults = (): void => {
    setItems([]);
    setWarnings([]);
    setSuccessNote(null);
  };

  const handleFile = (file: File): void => {
    run(async () => {
      resetResults();
      const image = await loadImageFromFile(file);
      const canvas = drawImageToCanvas(image);
      const ratio = transparentPixelRatio(getCanvasImageData(canvas));
      setSheetCanvas(canvas);
      setTransparentRatio(ratio);
      setSelectedFrameIds(new Set());
      setHasManualEdits(false);
      setFrames(
        ratio >= OPAQUE_WARNING_RATIO
          ? toStampFrames(canvas, detectionOptions)
          : [],
      );
    });
  };

  const handleApplyBgRemoval = (): void => {
    if (sheetCanvas === null) return;
    run(async () => {
      const imageData = getCanvasImageData(sheetCanvas);
      const removal = removeBackgroundByFloodFill(
        imageData,
        bgRemovalTolerance,
      );
      const newImageData = new ImageData(
        removal.data,
        imageData.width,
        imageData.height,
      );
      const newCanvas = imageDataToCanvas(newImageData);
      setSheetCanvas(newCanvas);
      setTransparentRatio(transparentPixelRatio(newImageData));
      setSelectedFrameIds(new Set());
      setHasManualEdits(false);
      setFrames(toStampFrames(newCanvas, detectionOptions));
    });
  };

  const rerunDetection = (options: DetectStampSheetRegionsOptions): void => {
    if (sheetCanvas === null || looksOpaque) return;
    setFrames(toStampFrames(sheetCanvas, options));
    setSelectedFrameIds(new Set());
    setHasManualEdits(false);
  };

  const handleAlphaThresholdChange = (value: number): void => {
    setAlphaThreshold(value);
    if (!hasManualEdits)
      rerunDetection({ ...detectionOptions, alphaThreshold: value });
  };
  const handleMinAreaChange = (value: number): void => {
    setMinArea(value);
    if (!hasManualEdits)
      rerunDetection({ ...detectionOptions, minArea: value });
  };
  const handleMergeDistanceChange = (value: number): void => {
    setMergeDistance(value);
    if (!hasManualEdits)
      rerunDetection({ ...detectionOptions, mergeDistance: value });
  };
  const handleExplicitRerun = (): void => rerunDetection(detectionOptions);

  const commitFrames = (next: StampFrame[]): void => {
    setFrames(next);
    setHasManualEdits(true);
  };

  const toggleSelect = (frameId: string): void => {
    setSelectedFrameIds((prev) => {
      const next = new Set(prev);
      if (next.has(frameId)) next.delete(frameId);
      else next.add(frameId);
      return next;
    });
  };

  const moveFrame = (index: number, direction: -1 | 1): void => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= frames.length) return;
    const next = [...frames];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    commitFrames(next);
  };

  const removeFrame = (frameId: string): void => {
    commitFrames(frames.filter((frame) => frame.id !== frameId));
    setSelectedFrameIds((prev) => {
      if (!prev.has(frameId)) return prev;
      const next = new Set(prev);
      next.delete(frameId);
      return next;
    });
  };

  const mergeSelected = (): void => {
    if (selectedFrameIds.size < 2) return;
    const survivingIndex = frames.findIndex((frame) =>
      selectedFrameIds.has(frame.id),
    );
    const toMerge = frames.filter((frame) => selectedFrameIds.has(frame.id));
    const unionRect = toMerge.reduce<PixelRect>(
      (acc, frame) => unionPixelRect(acc, frame),
      toMerge[0],
    );
    const merged: StampFrame = { id: createStampFrameId(), ...unionRect };
    const remaining = frames.filter((frame) => !selectedFrameIds.has(frame.id));
    remaining.splice(survivingIndex, 0, merged);
    commitFrames(remaining);
    setSelectedFrameIds(new Set());
  };

  const handleExport = (): void => {
    if (sheetCanvas === null || frames.length === 0) return;
    run(async () => {
      if (frames.length > MAX_STAMP_INDEX) {
        throw new RangeError(
          `一度に書き出せるのは${MAX_STAMP_INDEX}枚までです(${frames.length}件の枠があります)`,
        );
      }
      resetResults();
      const warningList: string[] = [];
      if (frames.length > MAX_STICKER_COUNT) {
        warningList.push(
          `LINEスタンプは最大${MAX_STICKER_COUNT}個です(${frames.length}件を処理しますが申請時にご注意ください)`,
        );
      }
      const results: DownloadItem[] = [];
      for (let index = 0; index < frames.length; index++) {
        const frame = frames[index];
        const stampNumber = index + 1;
        const cropped = cropCanvas(sheetCanvas, frame);
        const croppedImageData = getCanvasImageData(cropped);
        if (!hasAnyTransparency(croppedImageData)) {
          warningList.push(
            `${stampNumber}番: 透過画素がありません。背景透過が適用されているか確認してください`,
          );
        }
        const contentBounds = findOpaqueBounds(croppedImageData) ?? {
          x: 0,
          y: 0,
          width: cropped.width,
          height: cropped.height,
        };
        const stampFiles = await renderStampSizeSet(
          cropped,
          contentBounds,
          paddingPx,
          stampNumber,
        );
        for (const stampFile of stampFiles) {
          results.push({
            fileName: stampFile.fileName,
            blob: bytesToBlob(stampFile.pngBytes, "image/png"),
            note: stampFile.note,
          });
        }
      }
      setItems(results);
      setWarnings(warningList);
      setSuccessNote(
        `${frames.length}枚 × 3サイズ = ${results.length}ファイルを書き出し、全出力の実寸検証に合格しました`,
      );
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p>
          複数のスタンプイラストが並んだシート画像から、1枚ずつの枠を自動検出します。枠を調整して確定すると、
          LINEスタンプの3サイズ(本体370×320 / メイン240×240 /
          タブ96×74)を一括書き出しします。
        </p>
      </div>
      <FileDrop
        accept="image/png,image/jpeg,image/webp"
        disabled={isProcessing}
        description="スタンプが並んだシート画像(1枚)"
        onFiles={(files) => handleFile(files[0])}
      />
      <ToolStatus
        isProcessing={isProcessing}
        errorMessage={errorMessage}
        processingLabel="処理中…"
      />

      {sheetCanvas !== null && (
        <>
          {looksOpaque && (
            <div className="space-y-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p>
                ⚠
                シートがほぼ不透明です。LINEスタンプには背景透過が必須のため、検出の前に背景透過を適用してください。
              </p>
              <LabeledSlider
                label="背景透過の許容差(大きいほど広い色範囲を背景とみなす)"
                min={0}
                max={128}
                step={2}
                value={bgRemovalTolerance}
                disabled={isProcessing}
                onChange={setBgRemovalTolerance}
              />
              <button
                type="button"
                onClick={handleApplyBgRemoval}
                disabled={isProcessing}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                背景透過を適用
              </button>
            </div>
          )}

          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-700">
              検出パラメータ
            </h3>
            <LabeledSlider
              label="アルファ閾値(これを超える画素を前景とみなす)"
              min={0}
              max={255}
              step={1}
              value={alphaThreshold}
              disabled={isProcessing || looksOpaque}
              onChange={handleAlphaThresholdChange}
            />
            <LabeledSlider
              label="最小面積(これ未満の検出はノイズとして除外)"
              min={0}
              max={2000}
              step={10}
              value={minArea}
              unit="px²"
              disabled={isProcessing || looksOpaque}
              onChange={handleMinAreaChange}
            />
            <LabeledSlider
              label="結合距離(この距離以内の領域は1つのスタンプに結合)"
              min={0}
              max={200}
              step={5}
              value={mergeDistance}
              unit="px"
              disabled={isProcessing || looksOpaque}
              onChange={handleMergeDistanceChange}
            />
            {hasManualEdits && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p>
                  枠を手動編集したため、スライダーの変更は自動反映されません。
                </p>
                <button
                  type="button"
                  onClick={handleExplicitRerun}
                  disabled={isProcessing || looksOpaque}
                  className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  パラメータを反映して再検出(手動編集は破棄されます)
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="overflow-x-auto">
              <StampFrameOverlay
                sourceCanvas={sheetCanvas}
                frames={frames}
                selectedFrameIds={selectedFrameIds}
                disabled={isProcessing || looksOpaque}
                onFramesChange={commitFrames}
                onToggleSelect={toggleSelect}
              />
            </div>
            <StampFrameList
              frames={frames}
              selectedFrameIds={selectedFrameIds}
              disabled={isProcessing}
              onMove={moveFrame}
              onRemove={removeFrame}
              onToggleSelect={toggleSelect}
              onMergeSelected={mergeSelected}
            />
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
          <button
            type="button"
            onClick={handleExport}
            disabled={isProcessing || frames.length === 0}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {frames.length}枚 × 3サイズで書き出し
          </button>
        </>
      )}

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
      <DownloadList items={items} zipFileName="line_stamp_sheet_images.zip" />
    </div>
  );
}
