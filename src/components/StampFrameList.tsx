import type { ReactElement } from "react";
import type { StampFrame } from "../lib/stampFrame";

interface StampFrameListProps {
  frames: readonly StampFrame[];
  selectedFrameIds: ReadonlySet<string>;
  disabled?: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (frameId: string) => void;
  onToggleSelect: (frameId: string) => void;
  onMergeSelected: () => void;
}

/**
 * 検出/編集済みの枠の採番順一覧。並べ替え(採番順=書き出し順)・削除・
 * 結合対象の選択・結合実行をまとめて操作できる
 */
export function StampFrameList({
  frames,
  selectedFrameIds,
  disabled = false,
  onMove,
  onRemove,
  onToggleSelect,
  onMergeSelected,
}: StampFrameListProps): ReactElement | null {
  if (frames.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">
          検出枠({frames.length}件・採番順)
        </h3>
        <button
          type="button"
          disabled={disabled || selectedFrameIds.size < 2}
          onClick={onMergeSelected}
          className="rounded-lg bg-action-confirm px-3 py-1.5 text-sm font-medium text-ink-inverted hover:bg-action-confirm-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          選択した{selectedFrameIds.size}件を結合
        </button>
      </div>
      <ol className="divide-y divide-line-subtle rounded-lg border border-line bg-surface">
        {frames.map((frame, index) => (
          <li key={frame.id} className="flex items-center gap-2 px-4 py-2.5">
            <input
              type="checkbox"
              aria-label={`${index + 1}番を結合対象として選択`}
              checked={selectedFrameIds.has(frame.id)}
              disabled={disabled}
              onChange={() => onToggleSelect(frame.id)}
              className="size-4"
            />
            <span className="w-6 shrink-0 text-right font-mono text-xs text-subtle">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-strong">
                {Math.round(frame.width)}×{Math.round(frame.height)}px
              </p>
              <p className="text-xs text-muted">
                位置 ({Math.round(frame.x)}, {Math.round(frame.y)})
              </p>
            </div>
            <button
              type="button"
              disabled={disabled || index === 0}
              onClick={() => onMove(index, -1)}
              className="rounded border border-line-strong px-2 py-1 text-xs text-ink-soft hover:bg-surface-muted disabled:opacity-30"
              aria-label={`${index + 1}番を上へ移動`}
            >
              ↑
            </button>
            <button
              type="button"
              disabled={disabled || index === frames.length - 1}
              onClick={() => onMove(index, 1)}
              className="rounded border border-line-strong px-2 py-1 text-xs text-ink-soft hover:bg-surface-muted disabled:opacity-30"
              aria-label={`${index + 1}番を下へ移動`}
            >
              ↓
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemove(frame.id)}
              className="rounded border border-danger-border px-2 py-1 text-xs text-action-destructive hover:bg-danger-bg disabled:opacity-30"
              aria-label={`${index + 1}番を削除`}
            >
              削除
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
