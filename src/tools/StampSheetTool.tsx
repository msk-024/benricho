import { useState } from "react";
import type { ReactElement } from "react";
import { DownloadList, type DownloadItem } from "../components/DownloadList";
import { FileDrop } from "../components/FileDrop";
import { LabeledSlider } from "../components/LabeledSlider";
import { StampFrameList } from "../components/StampFrameList";
import { StampFrameOverlay } from "../components/StampFrameOverlay";
import {
  StampPreviewGrid,
  type StampPreviewItem,
} from "../components/StampPreviewGrid";
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
  type RgbaImage,
} from "../lib/imageOps";
import { createStampFrameId, type StampFrame } from "../lib/stampFrame";
import {
  analyzeStampSheet,
  computeDefaultAttachDistance,
  detectStampSheetRegions,
  STAMP_SHEET_DETECTION_DEFAULTS,
  type DetectStampSheetRegionsOptions,
} from "../lib/stampSheetDetect";
import {
  assignGroupsToFrames,
  isolateFrameOwnership,
} from "../lib/stampIsolate";
import { detectContentCutoff } from "../lib/stampCutoffDetect";
import { computeSizeRatio } from "../lib/stampSizeRatio";
import { isMainOrTabFile } from "../lib/stampNaming";

/** 透過画素の割合がこれ未満なら「実質未透過」とみなし、背景透過を促す */
const OPAQUE_WARNING_RATIO = 0.01;
/** 書き出し元の枠がこれ未満(本体サイズ370×320の半分)なら、拡大でぼやける可能性を警告する */
const UNDERSIZED_SOURCE_WIDTH = 185;
const UNDERSIZED_SOURCE_HEIGHT = 160;

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
  // 固定デフォルトを持たず、画像読み込み時に computeDefaultAttachDistance で自動計算する
  const [attachDistance, setAttachDistance] = useState<number>(3);
  // 直近にframesを(再)検出した際に実際使われた検出オプション。写り込み除去(analyzeStampSheet)は
  // 書き出し時点のスライダー生値ではなく必ずこれを使い、手動編集後にスライダーだけ動かしても
  // 「今のframesの元になった基準」とズレないようにする
  const [frameDetectionOptions, setFrameDetectionOptions] =
    useState<DetectStampSheetRegionsOptions>({
      alphaThreshold: STAMP_SHEET_DETECTION_DEFAULTS.alphaThreshold,
      minArea: STAMP_SHEET_DETECTION_DEFAULTS.minArea,
      attachDistance: 3,
      fragmentRatio: STAMP_SHEET_DETECTION_DEFAULTS.fragmentRatio,
    });
  const [frames, setFrames] = useState<StampFrame[]>([]);
  const [hasManualEdits, setHasManualEdits] = useState(false);
  const [selectedFrameIds, setSelectedFrameIds] = useState<Set<string>>(
    new Set(),
  );
  const [paddingPx, setPaddingPx] = useState(10);
  // 直近の書き出しで実際に使われた余白。メイン/タブの再生成は、スライダーの現在値ではなく
  // 必ずこの値を使い、同じセット内の本体画像とのフレーミングのズレを防ぐ
  const [exportPaddingPx, setExportPaddingPx] = useState(10);
  const [mainIndex, setMainIndex] = useState(0);
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [previewItems, setPreviewItems] = useState<StampPreviewItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const { isProcessing, errorMessage, run } = useAsyncTask();

  const looksOpaque = transparentRatio < OPAQUE_WARNING_RATIO;
  const detectionOptions: DetectStampSheetRegionsOptions = {
    alphaThreshold,
    minArea,
    attachDistance,
    fragmentRatio: STAMP_SHEET_DETECTION_DEFAULTS.fragmentRatio,
  };

  const resetResults = (): void => {
    setItems([]);
    setPreviewItems([]);
    setWarnings([]);
    setSuccessNote(null);
    setMainIndex(0);
  };

  const handleFile = (file: File): void => {
    run(async () => {
      resetResults();
      const image = await loadImageFromFile(file);
      const canvas = drawImageToCanvas(image);
      const ratio = transparentPixelRatio(getCanvasImageData(canvas));
      // 吸着距離は画像サイズに依存するため、新しいシートを読み込むたびに自動計算し直す
      const defaultAttachDistance = computeDefaultAttachDistance(
        canvas.width,
        canvas.height,
      );
      const options: DetectStampSheetRegionsOptions = {
        ...detectionOptions,
        attachDistance: defaultAttachDistance,
      };
      setSheetCanvas(canvas);
      setTransparentRatio(ratio);
      setAttachDistance(defaultAttachDistance);
      setSelectedFrameIds(new Set());
      setHasManualEdits(false);
      setFrameDetectionOptions(options);
      setFrames(
        ratio >= OPAQUE_WARNING_RATIO ? toStampFrames(canvas, options) : [],
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
      setFrameDetectionOptions(detectionOptions);
      setFrames(toStampFrames(newCanvas, detectionOptions));
    });
  };

  const rerunDetection = (options: DetectStampSheetRegionsOptions): void => {
    if (sheetCanvas === null || looksOpaque) return;
    // 枠が変わるため、直前の書き出し結果(プレビュー・ダウンロード一覧)は枠とズレてしまう。
    // 古い結果を見ながら「メインにする」を押すと別の絵を書き出してしまうため必ず破棄する
    resetResults();
    setFrameDetectionOptions(options);
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
  const handleAttachDistanceChange = (value: number): void => {
    setAttachDistance(value);
    if (!hasManualEdits)
      rerunDetection({ ...detectionOptions, attachDistance: value });
  };
  const handleExplicitRerun = (): void => rerunDetection(detectionOptions);

  const commitFrames = (next: StampFrame[]): void => {
    // 枠を手動編集した時点で、直前の書き出し結果(プレビュー・ダウンロード一覧)は
    // 枠とズレてしまうため破棄する(古い結果のまま「メインにする」を押すと
    // 編集後の別の枠から誤って書き出してしまうのを防ぐ)
    resetResults();
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
      // resetResults() はメイン/タブの選択を1番目(index 0)に戻す。
      // mainIndex state の反映は非同期なので、この書き出し内では直接0を使う
      const exportMainIndex = 0;
      const warningList: string[] = [];
      if (frames.length > MAX_STICKER_COUNT) {
        warningList.push(
          `LINEスタンプは最大${MAX_STICKER_COUNT}個です(${frames.length}件を処理しますが申請時にご注意ください)`,
        );
      }
      const sheetImageData = getCanvasImageData(sheetCanvas);
      // 書き出し直前のシートを1回だけ解析し、枠ごとに「お隣のイラストの写り込み」を
      // 消すための画素所有権を求める(枠は手動編集済みの場合があるため画素の重なりで対応付ける)。
      // frameDetectionOptionsを使うのは、スライダーの生値ではなく「今のframesの元になった
      // 基準」で解析して、手動編集後にスライダーだけ動かしてもズレないようにするため
      const { regions, ownerMap } = analyzeStampSheet(
        sheetImageData,
        frameDetectionOptions,
      );
      const groupOwnerFrameIndex = assignGroupsToFrames(
        ownerMap,
        regions,
        sheetImageData.width,
        frames,
      );
      const results: DownloadItem[] = [];
      const newPreviewItems: StampPreviewItem[] = [];
      for (let index = 0; index < frames.length; index++) {
        const frame = frames[index];
        const stampNumber = index + 1;
        const cropped = cropCanvas(sheetCanvas, frame);
        const croppedImageData = getCanvasImageData(cropped);
        const isolatedData = isolateFrameOwnership(
          croppedImageData,
          frame,
          index,
          sheetImageData.width,
          ownerMap,
          groupOwnerFrameIndex,
        );
        const isolatedImage: RgbaImage = {
          width: cropped.width,
          height: cropped.height,
          data: isolatedData,
        };
        const isolatedCanvas = imageDataToCanvas(
          new ImageData(isolatedData, cropped.width, cropped.height),
        );
        if (!hasAnyTransparency(isolatedImage)) {
          warningList.push(
            `${stampNumber}番: 透過画素がありません。背景透過が適用されているか確認してください`,
          );
        }
        const contentBounds = findOpaqueBounds(isolatedImage) ?? {
          x: 0,
          y: 0,
          width: cropped.width,
          height: cropped.height,
        };
        // 枠自体ではなく実際の絵の大きさ(contentBounds)で判定する。枠に余白が
        // 大きく含まれるケースでも、拡大でぼやけるかどうかを正しく警告するため
        if (
          contentBounds.width < UNDERSIZED_SOURCE_WIDTH &&
          contentBounds.height < UNDERSIZED_SOURCE_HEIGHT
        ) {
          warningList.push(
            `${stampNumber}番: 元の絵が小さいため拡大され、ぼやけて見える可能性があります`,
          );
        }
        const kinds =
          index === exportMainIndex
            ? (["sticker", "main", "tab"] as const)
            : (["sticker"] as const);
        const stampFiles = await renderStampSizeSet(
          isolatedCanvas,
          contentBounds,
          paddingPx,
          stampNumber,
          kinds,
        );
        for (const stampFile of stampFiles) {
          const blob = bytesToBlob(stampFile.pngBytes, "image/png");
          results.push({
            fileName: stampFile.fileName,
            blob,
            note: stampFile.note,
          });
          if (stampFile.kind === "sticker") {
            newPreviewItems.push({
              id: frame.id,
              stampNumber,
              blob,
              cutoff: detectContentCutoff(sheetImageData, frame, {
                alphaThreshold: frameDetectionOptions.alphaThreshold,
              }),
              sizeRatio: computeSizeRatio(stampFile.fitRect, 370, 320),
            });
          }
        }
      }
      setItems(results);
      setPreviewItems(newPreviewItems);
      setWarnings(warningList);
      setExportPaddingPx(paddingPx);
      setSuccessNote(
        `${frames.length}枚 × 3サイズ = ${results.length}ファイルを書き出し、全出力の実寸検証に合格しました`,
      );
    });
  };

  const handleSelectMain = (index: number): void => {
    if (
      sheetCanvas === null ||
      index === mainIndex ||
      frames[index] === undefined
    )
      return;
    run(async () => {
      const frame = frames[index];
      const stampNumber = index + 1;
      const sheetImageData = getCanvasImageData(sheetCanvas);
      // 本体書き出し(handleExport)と同じく、お隣のイラストの写り込みを除去してから
      // main/tabを作る(ここを素通りさせると選び直した1枚だけ写り込みが残ってしまう)
      const { regions, ownerMap } = analyzeStampSheet(
        sheetImageData,
        frameDetectionOptions,
      );
      const groupOwnerFrameIndex = assignGroupsToFrames(
        ownerMap,
        regions,
        sheetImageData.width,
        frames,
      );
      const cropped = cropCanvas(sheetCanvas, frame);
      const croppedImageData = getCanvasImageData(cropped);
      const isolatedData = isolateFrameOwnership(
        croppedImageData,
        frame,
        index,
        sheetImageData.width,
        ownerMap,
        groupOwnerFrameIndex,
      );
      const isolatedImage: RgbaImage = {
        width: cropped.width,
        height: cropped.height,
        data: isolatedData,
      };
      const isolatedCanvas = imageDataToCanvas(
        new ImageData(isolatedData, cropped.width, cropped.height),
      );
      const contentBounds = findOpaqueBounds(isolatedImage) ?? {
        x: 0,
        y: 0,
        width: cropped.width,
        height: cropped.height,
      };
      const mainTabFiles = await renderStampSizeSet(
        isolatedCanvas,
        contentBounds,
        exportPaddingPx,
        stampNumber,
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
      <div className="rounded-lg bg-surface-muted px-4 py-3 text-sm text-ink-soft">
        <p>
          複数のスタンプイラストが並んだシート画像から、1枚ずつの枠を自動検出します。枠を調整して確定すると、
          LINEスタンプの3サイズ(本体370×320 / メイン240×240 /
          タブ96×74)を一括書き出しします。
        </p>
      </div>
      <div className="rounded-lg bg-surface-muted px-4 py-3 text-sm text-ink-soft">
        <p className="font-semibold text-ink">きれいに分割するためのお願い</p>
        <ul className="mt-1 list-inside list-disc">
          <li>背景は透過PNG(または無地の白)にしてください</li>
          <li>
            イラスト同士は少しすき間を空けてください(目安:画像の横幅の2%以上)
          </li>
          <li>
            1つのスタンプにしたいパーツ(文字・吹き出しなど)は、本体とつなげるか、すぐ近くに置いてください
          </li>
          <li>
            1つのイラストが横370px程度以上になるサイズで描いてください(例:横に4つ並べるなら画像の横幅1500px以上)
          </li>
          <li>1枚に入れられるのは40個までです</li>
        </ul>
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
            <div className="space-y-3 rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn-ink">
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
                className="rounded-lg bg-action-primary px-4 py-2 text-sm font-medium text-ink-inverted hover:bg-action-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                背景透過を適用
              </button>
            </div>
          )}

          <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
            <h3 className="text-sm font-semibold text-ink">検出パラメータ</h3>
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
              label="破片を吸着する距離(草や小さな文字を近くのイラストにくっつける)"
              min={0}
              max={100}
              step={1}
              value={attachDistance}
              unit="px"
              disabled={isProcessing || looksOpaque}
              onChange={handleAttachDistanceChange}
            />
            {hasManualEdits && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn-ink">
                <p>
                  枠を手動編集したため、スライダーの変更は自動反映されません。
                </p>
                <button
                  type="button"
                  onClick={handleExplicitRerun}
                  disabled={isProcessing || looksOpaque}
                  className="shrink-0 rounded-lg bg-warn-solid px-3 py-1.5 text-xs font-medium text-ink-inverted hover:bg-warn-solid-hover disabled:cursor-not-allowed disabled:opacity-50"
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
            className="rounded-lg bg-action-confirm px-4 py-2 text-sm font-medium text-ink-inverted hover:bg-action-confirm-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {frames.length}枚 × 3サイズで書き出し
          </button>
        </>
      )}

      {warnings.length > 0 && (
        <ul className="space-y-1 rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn-ink">
          {warnings.map((warning) => (
            <li key={warning}>⚠ {warning}</li>
          ))}
        </ul>
      )}
      {successNote !== null && !isProcessing && (
        <p className="rounded-lg bg-success-bg px-4 py-3 text-sm text-success-ink">
          ✓ {successNote}
        </p>
      )}
      <StampPreviewGrid
        items={previewItems}
        mainIndex={mainIndex}
        onSelectMain={handleSelectMain}
        disabled={isProcessing}
      />
      <DownloadList items={items} zipFileName="line_stamp_sheet_images.zip" />
    </div>
  );
}
