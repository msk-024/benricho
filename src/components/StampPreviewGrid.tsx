import { useState } from "react";
import type { ReactElement } from "react";
import { useObjectUrl } from "../hooks/useObjectUrl";
import { hasAnyCutoff, type CutoffEdges } from "../lib/stampCutoffDetect";
import type { SizeRatioResult } from "../lib/stampSizeRatio";
import { CHECKER_PATTERN_CLASS } from "./checkerBackground";

export interface StampPreviewItem {
  id: string;
  stampNumber: number;
  blob: Blob;
  cutoff: CutoffEdges;
  sizeRatio: SizeRatioResult;
}

type PreviewBackground = "white" | "dark" | "transparent";

interface StampPreviewGridProps {
  items: readonly StampPreviewItem[];
  /** メイン・タブ画像の元ネタとして選択中のitems内インデックス */
  mainIndex: number;
  onSelectMain: (index: number) => void;
  disabled?: boolean;
}

const BACKGROUND_OPTIONS: ReadonlyArray<{
  value: PreviewBackground;
  label: string;
}> = [
  { value: "white", label: "白" },
  { value: "dark", label: "ダーク" },
  { value: "transparent", label: "透過" },
];

/**
 * サムネイルの背景色(白/ダーク/透過)。LINEでの見え方を確認するための
 * ユーザー選択であり、アプリ自体のテーマとは無関係なので意図的にリテラル値のまま
 * (トークン化しない)。StampZoomModal内の配色も同じ理由でリテラルのまま。
 */
function backgroundClass(background: PreviewBackground): string {
  if (background === "white") return "bg-white";
  if (background === "dark") return "bg-slate-900";
  return CHECKER_PATTERN_CLASS;
}

/**
 * 書き出した本体(370×320)サムネイルの一覧表示。
 * 背景切替(白/ダーク/透過)・切れ検出・サイズ感チェックのバッジ・メイン/タブ元ネタの選択・
 * 拡大表示を提供する、LineStampTool/StampSheetTool共通のプレビュー部品。
 */
export function StampPreviewGrid({
  items,
  mainIndex,
  onSelectMain,
  disabled = false,
}: StampPreviewGridProps): ReactElement | null {
  const [background, setBackground] = useState<PreviewBackground>("white");
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

  if (items.length === 0) return null;
  const zoomItem = zoomIndex !== null ? items[zoomIndex] : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">
          プレビュー(本体 370×320・{items.length}件)
        </h3>
        <div className="flex gap-1">
          {BACKGROUND_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setBackground(option.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                background === option.value
                  ? "bg-action-primary text-ink-inverted"
                  : "bg-line-subtle text-ink-soft hover:bg-line"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {items.map((item, index) => (
          <StampPreviewThumbnail
            key={item.id}
            item={item}
            background={background}
            isMain={index === mainIndex}
            disabled={disabled}
            onSelectMain={() => onSelectMain(index)}
            onZoom={() => setZoomIndex(index)}
          />
        ))}
      </div>
      {zoomItem !== undefined && (
        <StampZoomModal item={zoomItem} onClose={() => setZoomIndex(null)} />
      )}
    </div>
  );
}

function StampPreviewThumbnail({
  item,
  background,
  isMain,
  disabled,
  onSelectMain,
  onZoom,
}: {
  item: StampPreviewItem;
  background: PreviewBackground;
  isMain: boolean;
  disabled: boolean;
  onSelectMain: () => void;
  onZoom: () => void;
}): ReactElement {
  const url = useObjectUrl(item.blob);
  const isCutoff = hasAnyCutoff(item.cutoff);
  const isUndersized = item.sizeRatio.isUndersized;

  return (
    <div className="space-y-1.5 rounded-lg border border-line bg-surface p-2">
      <button
        type="button"
        onClick={onZoom}
        aria-label={`${item.stampNumber}番を拡大表示`}
        className={`relative block w-full overflow-hidden rounded ${backgroundClass(background)}`}
        style={{ aspectRatio: "370 / 320" }}
      >
        {url !== null && (
          <img
            src={url}
            alt={`${item.stampNumber}番`}
            className="size-full object-contain"
          />
        )}
        {isCutoff && (
          <span className="pointer-events-none absolute inset-0 rounded border-2 border-danger-ink-subtle" />
        )}
      </button>
      <p className="text-center font-mono text-xs text-muted">
        {String(item.stampNumber).padStart(2, "0")}
      </p>
      <p className="text-center text-xs text-subtle">
        横{Math.round(item.sizeRatio.widthRatio * 100)}% ・ 縦
        {Math.round(item.sizeRatio.heightRatio * 100)}%
      </p>
      {isCutoff && (
        <p className="text-center text-xs text-danger-ink-soft">
          ⚠ 端が切れているかも
        </p>
      )}
      {isUndersized && (
        <p className="text-center text-xs text-warn-ink-subtle">
          ⚠ {item.sizeRatio.shortSide === "width" ? "縦長" : "横長"}
          のため小さく見えるかも
        </p>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={onSelectMain}
        className={`w-full rounded px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
          isMain
            ? "bg-action-confirm text-ink-inverted"
            : "border border-line-strong text-ink-soft hover:bg-surface-muted"
        }`}
      >
        {isMain ? "✓ メイン/タブに使用" : "メインにする"}
      </button>
    </div>
  );
}

function StampZoomModal({
  item,
  onClose,
}: {
  item: StampPreviewItem;
  onClose: () => void;
}): ReactElement {
  const [background, setBackground] = useState<"white" | "dark">("white");
  const url = useObjectUrl(item.blob);
  const isDark = background === "dark";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm space-y-3 rounded-lg bg-surface p-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">
            {item.stampNumber}番の拡大表示
          </p>
          <div className="flex gap-1">
            {(["white", "dark"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setBackground(value)}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  background === value
                    ? "bg-action-primary text-ink-inverted"
                    : "bg-line-subtle text-ink-soft hover:bg-line"
                }`}
              >
                {value === "white" ? "白" : "ダーク"}
              </button>
            ))}
          </div>
        </div>
        {/* 以下はLINEチャットでの見え方を模した固定シミュレーションなので、
            アプリのテーマに関わらずリテラル配色のまま(上のトグルで切り替える対象) */}
        <div
          className={`space-y-2 rounded-lg p-4 ${isDark ? "bg-slate-800" : "bg-slate-100"}`}
        >
          <div
            className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
              isDark ? "bg-slate-600 text-slate-100" : "bg-white text-slate-800"
            }`}
          >
            このスタンプどう？
          </div>
          <div className="flex justify-end">
            {url !== null && (
              <img src={url} alt={`${item.stampNumber}番`} className="w-32" />
            )}
          </div>
          <div
            className={`max-w-[70%] self-end rounded-2xl px-3 py-2 text-sm ${
              isDark ? "bg-emerald-700 text-white" : "bg-emerald-500 text-white"
            }`}
          >
            いいね!
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg border border-line-strong px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-muted"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
