import type { ReactElement } from "react";
import { formatBytes } from "../lib/fileName";

interface FileOrderListProps {
  files: readonly File[];
  disabled?: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
}

/** 選択済みファイルの並び替え・削除ができる一覧(結合順・ページ順の調整用) */
export function FileOrderList({
  files,
  disabled = false,
  onMove,
  onRemove,
}: FileOrderListProps): ReactElement | null {
  if (files.length === 0) return null;
  return (
    <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
      {files.map((file, index) => (
        <li
          key={`${index}-${file.name}`}
          className="flex items-center gap-2 px-4 py-2.5"
        >
          <span className="w-6 shrink-0 text-right font-mono text-xs text-slate-400">
            {index + 1}.
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">
              {file.name}
            </p>
            <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
          </div>
          <button
            type="button"
            disabled={disabled || index === 0}
            onClick={() => onMove(index, -1)}
            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30"
            aria-label={`${file.name} を上へ移動`}
          >
            ↑
          </button>
          <button
            type="button"
            disabled={disabled || index === files.length - 1}
            onClick={() => onMove(index, 1)}
            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30"
            aria-label={`${file.name} を下へ移動`}
          >
            ↓
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRemove(index)}
            className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-30"
            aria-label={`${file.name} を一覧から外す`}
          >
            外す
          </button>
        </li>
      ))}
    </ol>
  );
}
