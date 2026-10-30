import { useState } from "react";
import type { ReactElement } from "react";
import { CHECKER_PATTERN_CLASS } from "../components/checkerBackground";
import { FileDrop } from "../components/FileDrop";
import { LabeledSlider } from "../components/LabeledSlider";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import { useObjectUrl } from "../hooks/useObjectUrl";
import {
  canvasToBlob,
  drawImageToCanvas,
  getCanvasImageData,
  loadImageFromFile,
} from "../lib/canvas/canvasUtils";
import {
  upscalePixelArtCanvas,
  withGridOverlay,
} from "../lib/canvas/pixelArtExport";
import { downloadBlob } from "../lib/download";
import { replaceExtension } from "../lib/fileName";
import {
  convertToPixelArt,
  type PixelArtSampling,
  type RgbColor,
} from "../lib/pixelArt";

const GRID_PRESETS = [
  { id: "8", label: "8 × 8(超ミニ)", size: 8 },
  { id: "16", label: "16 × 16(レトロ標準)", size: 16 },
  { id: "32", label: "32 × 32", size: 32 },
  { id: "64", label: "64 × 64", size: 64 },
  { id: "custom", label: "カスタム", size: 0 },
] as const;

type GridPresetId = (typeof GRID_PRESETS)[number]["id"];
const MAX_GRID_SIZE = 128;

const UPSCALE_FACTORS = [1, 4, 8, 16, 32] as const;

interface GridSize {
  gridWidth: number;
  gridHeight: number;
}

interface PixelArtParams extends GridSize {
  colorCount: number;
  sampling: PixelArtSampling;
  showGrid: boolean;
  upscaleFactor: number;
}

interface PixelArtResultState {
  fileName: string;
  gridWidth: number;
  gridHeight: number;
  colorCount: number;
  palette: RgbColor[];
  previewBlob: Blob;
  pngBlob: Blob;
}

/**
 * 画像をドット絵(マス目+減色パレット)に変換するツール。
 * 量子化(median-cut)・ダウンサンプリングは自前実装(lib/pixelArt.ts)で、
 * 外部ライブラリ・外部AIサービスは使用しない。
 */
export function PixelArtTool(): ReactElement {
  const [gridPresetId, setGridPresetId] = useState<GridPresetId>("16");
  const [customGridWidth, setCustomGridWidth] = useState(24);
  const [customGridHeight, setCustomGridHeight] = useState(24);
  const [colorCount, setColorCount] = useState(16);
  const [sampling, setSampling] = useState<PixelArtSampling>("average");
  const [showGrid, setShowGrid] = useState(true);
  const [upscaleFactor, setUpscaleFactor] = useState(8);
  const [result, setResult] = useState<PixelArtResultState | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const { isProcessing, errorMessage, run } = useAsyncTask();
  const previewUrl = useObjectUrl(result?.previewBlob ?? null);

  const resolveGridSize = (presetId: GridPresetId): GridSize => {
    const preset = GRID_PRESETS.find((candidate) => candidate.id === presetId);
    if (preset !== undefined && preset.id !== "custom") {
      return { gridWidth: preset.size, gridHeight: preset.size };
    }
    return { gridWidth: customGridWidth, gridHeight: customGridHeight };
  };

  const buildParams = (
    overrides: Partial<PixelArtParams> = {},
  ): PixelArtParams => ({
    ...resolveGridSize(gridPresetId),
    colorCount,
    sampling,
    showGrid,
    upscaleFactor,
    ...overrides,
  });

  const reprocessWith = (overrides: Partial<PixelArtParams>): void => {
    if (lastFile !== null) processFile(lastFile, buildParams(overrides));
  };

  const processFile = (file: File, params: PixelArtParams): void => {
    run(async () => {
      if (
        !Number.isInteger(params.gridWidth) ||
        !Number.isInteger(params.gridHeight) ||
        params.gridWidth < 1 ||
        params.gridHeight < 1 ||
        params.gridWidth > MAX_GRID_SIZE ||
        params.gridHeight > MAX_GRID_SIZE
      ) {
        throw new RangeError(
          `マス目数は1〜${MAX_GRID_SIZE}の整数で指定してください`,
        );
      }
      const image = await loadImageFromFile(file);
      const sourceCanvas = drawImageToCanvas(image);
      const sourceImageData = getCanvasImageData(sourceCanvas);
      const { image: gridImage, palette } = convertToPixelArt(sourceImageData, {
        gridWidth: params.gridWidth,
        gridHeight: params.gridHeight,
        colorCount: params.colorCount,
        sampling: params.sampling,
      });
      const upscaledCanvas = upscalePixelArtCanvas(
        gridImage,
        params.upscaleFactor,
      );
      const pngBlob = await canvasToBlob(upscaledCanvas, "image/png");
      const previewCanvas = params.showGrid
        ? withGridOverlay(upscaledCanvas, params.upscaleFactor)
        : upscaledCanvas;
      const previewBlob = await canvasToBlob(previewCanvas, "image/png");
      setResult({
        fileName: replaceExtension(file.name, "png"),
        gridWidth: params.gridWidth,
        gridHeight: params.gridHeight,
        colorCount: palette.length,
        palette,
        previewBlob,
        pngBlob,
      });
      setLastFile(file);
    });
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm text-ink">
        <span className="mb-1 block font-medium">マス目(グリッドサイズ)</span>
        <select
          value={gridPresetId}
          disabled={isProcessing}
          onChange={(event) => {
            const id = event.target.value as GridPresetId;
            setGridPresetId(id);
            reprocessWith(resolveGridSize(id));
          }}
          className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2"
        >
          {GRID_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>
      {gridPresetId === "custom" && (
        <div className="flex items-center gap-3 text-sm text-ink">
          <label className="flex items-center gap-1.5">
            幅
            <input
              type="number"
              min={1}
              max={MAX_GRID_SIZE}
              value={customGridWidth}
              disabled={isProcessing}
              onChange={(event) => {
                const value = Number(event.target.value);
                setCustomGridWidth(value);
                reprocessWith({
                  gridWidth: value,
                  gridHeight: customGridHeight,
                });
              }}
              className="w-20 rounded-lg border border-line-strong px-2 py-1.5"
            />
          </label>
          ×
          <label className="flex items-center gap-1.5">
            高さ
            <input
              type="number"
              min={1}
              max={MAX_GRID_SIZE}
              value={customGridHeight}
              disabled={isProcessing}
              onChange={(event) => {
                const value = Number(event.target.value);
                setCustomGridHeight(value);
                reprocessWith({
                  gridWidth: customGridWidth,
                  gridHeight: value,
                });
              }}
              className="w-20 rounded-lg border border-line-strong px-2 py-1.5"
            />
          </label>
          マス
        </div>
      )}
      <LabeledSlider
        label="色数(パレット圧縮)"
        min={2}
        max={64}
        step={1}
        value={colorCount}
        unit="色"
        disabled={isProcessing}
        onChange={(value) => {
          setColorCount(value);
          reprocessWith({ colorCount: value });
        }}
      />
      <fieldset className="flex flex-wrap items-center gap-4 text-sm text-ink">
        <legend className="mb-2 text-sm font-medium">サンプリング方式</legend>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="pixel-art-sampling"
            checked={sampling === "average"}
            disabled={isProcessing}
            onChange={() => {
              setSampling("average");
              reprocessWith({ sampling: "average" });
            }}
            className="accent-action-primary"
          />
          平均色(なめらか)
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="pixel-art-sampling"
            checked={sampling === "dominant"}
            disabled={isProcessing}
            onChange={() => {
              setSampling("dominant");
              reprocessWith({ sampling: "dominant" });
            }}
            className="accent-action-primary"
          />
          代表色(くっきり)
        </label>
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={showGrid}
            disabled={isProcessing}
            onChange={(event) => {
              setShowGrid(event.target.checked);
              reprocessWith({ showGrid: event.target.checked });
            }}
            className="accent-action-primary"
          />
          プレビューにマス目線を表示
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          書き出し倍率
          <select
            value={upscaleFactor}
            disabled={isProcessing}
            onChange={(event) => {
              const value = Number(event.target.value);
              setUpscaleFactor(value);
              reprocessWith({ upscaleFactor: value });
            }}
            className="rounded-lg border border-line-strong bg-surface px-2 py-1.5"
          >
            {UPSCALE_FACTORS.map((factor) => (
              <option key={factor} value={factor}>
                {factor === 1
                  ? "×1(原寸・ドット編集用)"
                  : factor === 8
                    ? "×8(標準)"
                    : `×${factor}`}
              </option>
            ))}
          </select>
        </label>
      </div>
      <FileDrop
        accept="image/png,image/jpeg,image/webp"
        disabled={isProcessing}
        description="PNG / JPG / WebP(1ファイル)"
        onFiles={(files) => processFile(files[0], buildParams())}
      />
      <ToolStatus
        isProcessing={isProcessing}
        errorMessage={errorMessage}
        processingLabel="ドット絵に変換中…"
      />
      {result !== null && !isProcessing && (
        <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-ink-soft">
            {result.gridWidth}×{result.gridHeight}マス・使用色数{" "}
            {result.colorCount}色
          </p>
          <div
            className={`inline-block rounded border border-line-subtle p-2 ${CHECKER_PATTERN_CLASS}`}
          >
            {previewUrl !== null && (
              <img
                src={previewUrl}
                alt="ドット絵プレビュー"
                style={{ imageRendering: "pixelated" }}
                className="max-h-80 max-w-full"
              />
            )}
          </div>
          {result.palette.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {result.palette.map((color, index) => (
                <span
                  key={index}
                  title={`rgb(${color.r}, ${color.g}, ${color.b})`}
                  className="size-5 rounded border border-line-subtle"
                  style={{
                    backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                  }}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => downloadBlob(result.pngBlob, result.fileName)}
            className="rounded-lg bg-action-primary px-4 py-2 text-sm font-medium text-ink-inverted hover:bg-action-primary-hover"
          >
            PNGをダウンロード
          </button>
        </div>
      )}
    </div>
  );
}
