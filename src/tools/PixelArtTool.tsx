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
  rasterizeVectorImage,
  upscalePixelArtCanvas,
  withGridOverlay,
} from "../lib/canvas/pixelArtExport";
import { formatHex, parseHexColor } from "../lib/colorConvert";
import { downloadBlob } from "../lib/download";
import { replaceExtension } from "../lib/fileName";
import type { RgbaImage } from "../lib/imageOps";
import {
  applyColorAdjustments,
  downsampleToGrid,
  quantizeImageColors,
  quantizeToFixedPalette,
  replacePaletteColor,
  type PixelArtSampling,
  type RgbColor,
} from "../lib/pixelArt";
import { pixelArtToSvg } from "../lib/pixelArtSvg";

const GRID_PRESETS = [
  { id: "8", label: "8 × 8(超ミニ、ロゴ・単純な形向け)", size: 8 },
  { id: "16", label: "16 × 16(シンプルな画像向け)", size: 16 },
  { id: "32", label: "32 × 32(標準、人物・キャラクター向け)", size: 32 },
  { id: "64", label: "64 × 64(高精細)", size: 64 },
  { id: "custom", label: "カスタム", size: 0 },
] as const;

type GridPresetId = (typeof GRID_PRESETS)[number]["id"];
const MAX_GRID_SIZE = 128;

/**
 * プレビュー表示の目標サイズ(px、CSSのmax-h-80=320pxに合わせる)。
 * ブラウザは拡大表示では image-rendering:pixelated をクッキリ描画できるが、
 * 縮小表示では効かずぼやけることがあるため、プレビューはこのサイズを超えないよう
 * マス目数から逆算した倍率で生成し、縮小が発生しないようにする(書き出し倍率とは独立)。
 */
const PREVIEW_TARGET_PX = 320;

function computePreviewScale(gridWidth: number, gridHeight: number): number {
  return Math.max(
    1,
    Math.floor(PREVIEW_TARGET_PX / Math.max(gridWidth, gridHeight)),
  );
}

const UPSCALE_FACTORS = [1, 4, 8, 16, 32] as const;

/** 定番レトロパレット(ワンクリック適用用)。色数自動指定の代わりに固定色で量子化する */
const RETRO_PALETTES = [
  {
    id: "mono",
    label: "モノクロ(2色)",
    colors: [
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 255, b: 255 },
    ],
  },
  {
    id: "grayscale4",
    label: "グレースケール(4色)",
    colors: [
      { r: 0, g: 0, b: 0 },
      { r: 85, g: 85, b: 85 },
      { r: 170, g: 170, b: 170 },
      { r: 255, g: 255, b: 255 },
    ],
  },
  {
    id: "gameboy",
    label: "ゲームボーイ風(4色)",
    colors: [
      { r: 15, g: 56, b: 15 },
      { r: 48, g: 98, b: 48 },
      { r: 139, g: 172, b: 15 },
      { r: 155, g: 188, b: 15 },
    ],
  },
  {
    id: "sepia",
    label: "セピア(4色)",
    colors: [
      { r: 43, g: 29, b: 14 },
      { r: 111, g: 69, b: 24 },
      { r: 185, g: 139, b: 74 },
      { r: 237, g: 220, b: 192 },
    ],
  },
  {
    id: "vivid8",
    label: "ビビッド8色",
    colors: [
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 255, b: 255 },
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
      { r: 255, g: 255, b: 0 },
      { r: 0, g: 255, b: 255 },
      { r: 255, g: 0, b: 255 },
    ],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  colors: RgbColor[];
}[];

type RetroPaletteId = (typeof RETRO_PALETTES)[number]["id"];
type PaletteModeId = "auto" | RetroPaletteId;

interface GridSize {
  gridWidth: number;
  gridHeight: number;
}

interface PixelArtParams extends GridSize {
  colorCount: number;
  sampling: PixelArtSampling;
  contrastPercent: number;
  saturationPercent: number;
  paletteModeId: PaletteModeId;
  showGrid: boolean;
  upscaleFactor: number;
}

interface PixelArtResultState {
  fileName: string;
  gridWidth: number;
  gridHeight: number;
  gridImage: RgbaImage;
  palette: RgbColor[];
  previewBlob: Blob;
  pngBlob: Blob;
}

function rgbToCss(color: RgbColor): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

/**
 * 画像をドット絵(マス目+減色パレット)に変換するツール。
 * ダウンサンプリング・median-cut量子化・コントラスト/彩度調整は自前実装(lib/pixelArt.ts)で、
 * 外部ライブラリ・外部AIサービスは使用しない。
 */
export function PixelArtTool(): ReactElement {
  const [gridPresetId, setGridPresetId] = useState<GridPresetId>("32");
  const [customGridWidth, setCustomGridWidth] = useState(24);
  const [customGridHeight, setCustomGridHeight] = useState(24);
  const [colorCount, setColorCount] = useState(16);
  const [sampling, setSampling] = useState<PixelArtSampling>("average");
  const [contrastPercent, setContrastPercent] = useState(0);
  const [saturationPercent, setSaturationPercent] = useState(0);
  const [paletteModeId, setPaletteModeId] = useState<PaletteModeId>("auto");
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
    contrastPercent,
    saturationPercent,
    paletteModeId,
    showGrid,
    upscaleFactor,
    ...overrides,
  });

  const reprocessWith = (overrides: Partial<PixelArtParams>): void => {
    if (lastFile !== null) processFile(lastFile, buildParams(overrides));
  };

  const buildOutputs = async (
    gridImage: RgbaImage,
    downloadScale: number,
    withGridLines: boolean,
  ): Promise<{ previewBlob: Blob; pngBlob: Blob }> => {
    const downloadCanvas = upscalePixelArtCanvas(gridImage, downloadScale);
    const pngBlob = await canvasToBlob(downloadCanvas, "image/png");

    // プレビューは書き出し倍率と無関係に、縮小表示が発生しないスケールで別途生成する
    const previewScale = computePreviewScale(gridImage.width, gridImage.height);
    const previewBaseCanvas = upscalePixelArtCanvas(gridImage, previewScale);
    const previewCanvas = withGridLines
      ? withGridOverlay(previewBaseCanvas, previewScale)
      : previewBaseCanvas;
    const previewBlob = await canvasToBlob(previewCanvas, "image/png");

    return { previewBlob, pngBlob };
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
      const isVector =
        file.type === "image/svg+xml" ||
        file.name.toLowerCase().endsWith(".svg");
      const sourceCanvas = isVector
        ? rasterizeVectorImage(image)
        : drawImageToCanvas(image);
      const sourceImageData = getCanvasImageData(sourceCanvas);
      const grid = downsampleToGrid(
        sourceImageData,
        params.gridWidth,
        params.gridHeight,
        params.sampling,
      );
      const adjusted = applyColorAdjustments(
        grid,
        params.contrastPercent,
        params.saturationPercent,
      );
      const { image: gridImage, palette } =
        params.paletteModeId === "auto"
          ? quantizeImageColors(adjusted, params.colorCount)
          : quantizeToFixedPalette(
              adjusted,
              RETRO_PALETTES.find((p) => p.id === params.paletteModeId)!.colors,
            );
      const outputs = await buildOutputs(
        gridImage,
        params.upscaleFactor,
        params.showGrid,
      );
      setResult({
        fileName: replaceExtension(file.name, "png"),
        gridWidth: params.gridWidth,
        gridHeight: params.gridHeight,
        gridImage,
        palette,
        ...outputs,
      });
      setLastFile(file);
    });
  };

  const handleRecolor = (index: number, hex: string): void => {
    if (result === null) return;
    run(async () => {
      const parsed = parseHexColor(hex);
      const { image: nextGridImage, palette: nextPalette } =
        replacePaletteColor(result.gridImage, result.palette, index, {
          r: parsed.r,
          g: parsed.g,
          b: parsed.b,
        });
      const outputs = await buildOutputs(
        nextGridImage,
        upscaleFactor,
        showGrid,
      );
      setResult({
        ...result,
        gridImage: nextGridImage,
        palette: nextPalette,
        ...outputs,
      });
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <LabeledSlider
          label="コントラスト"
          min={-100}
          max={100}
          step={5}
          value={contrastPercent}
          unit="%"
          disabled={isProcessing}
          onChange={(value) => {
            setContrastPercent(value);
            reprocessWith({ contrastPercent: value });
          }}
        />
        <LabeledSlider
          label="彩度"
          min={-100}
          max={100}
          step={5}
          value={saturationPercent}
          unit="%"
          disabled={isProcessing}
          onChange={(value) => {
            setSaturationPercent(value);
            reprocessWith({ saturationPercent: value });
          }}
        />
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink">
          パレット
        </span>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="パレットを選ぶ"
        >
          <button
            type="button"
            aria-pressed={paletteModeId === "auto"}
            disabled={isProcessing}
            onClick={() => {
              setPaletteModeId("auto");
              reprocessWith({ paletteModeId: "auto" });
            }}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              paletteModeId === "auto"
                ? "border-ink-strong bg-ink-strong text-ink-inverted"
                : "border-line-strong bg-surface text-ink"
            }`}
          >
            自動(色数指定)
          </button>
          {RETRO_PALETTES.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-pressed={paletteModeId === preset.id}
              disabled={isProcessing}
              onClick={() => {
                setPaletteModeId(preset.id);
                reprocessWith({ paletteModeId: preset.id });
              }}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                paletteModeId === preset.id
                  ? "border-ink-strong bg-ink-strong text-ink-inverted"
                  : "border-line-strong bg-surface text-ink"
              }`}
            >
              <span className="flex gap-0.5">
                {preset.colors.map((color, index) => (
                  <span
                    key={index}
                    className="size-2.5 rounded-full border border-line-subtle"
                    style={{ backgroundColor: rgbToCss(color) }}
                  />
                ))}
              </span>
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <LabeledSlider
        label="色数(パレット圧縮、「自動」選択時のみ有効)"
        min={2}
        max={64}
        step={1}
        value={colorCount}
        unit="色"
        disabled={isProcessing || paletteModeId !== "auto"}
        onChange={(value) => {
          setColorCount(value);
          reprocessWith({ colorCount: value });
        }}
      />
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
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        disabled={isProcessing}
        description="PNG / JPG / WebP / SVG(1ファイル)"
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
            {result.palette.length}色
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
            <div className="flex flex-wrap gap-1.5">
              {result.palette.map((color, index) => (
                <label
                  key={index}
                  title={`クリックで色を変更(現在: ${rgbToCss(color)})`}
                  className="relative block size-6 cursor-pointer overflow-hidden rounded border border-line-subtle"
                  style={{ backgroundColor: rgbToCss(color) }}
                >
                  <input
                    type="color"
                    value={formatHex({ ...color, a: 1 })}
                    disabled={isProcessing}
                    onChange={(event) =>
                      handleRecolor(index, event.target.value)
                    }
                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                  />
                </label>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadBlob(result.pngBlob, result.fileName)}
              className="rounded-lg bg-action-primary px-4 py-2 text-sm font-medium text-ink-inverted hover:bg-action-primary-hover"
            >
              PNGをダウンロード
            </button>
            <button
              type="button"
              onClick={() => {
                const svgBlob = new Blob([pixelArtToSvg(result.gridImage)], {
                  type: "image/svg+xml",
                });
                downloadBlob(svgBlob, replaceExtension(result.fileName, "svg"));
              }}
              className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-surface-muted"
            >
              SVGをダウンロード(拡大しても劣化なし)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
