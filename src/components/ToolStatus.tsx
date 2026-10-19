import type { ReactElement } from "react";

interface ToolStatusProps {
  isProcessing: boolean;
  errorMessage: string | null;
  processingLabel?: string;
}

/** 処理中インジケーターとエラー表示の共通コンポーネント */
export function ToolStatus({
  isProcessing,
  errorMessage,
  processingLabel = "処理中…",
}: ToolStatusProps): ReactElement | null {
  if (isProcessing) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-info-bg px-4 py-3 text-sm text-info-ink">
        <span className="inline-block size-4 animate-spin rounded-full border-2 border-info-border border-t-transparent" />
        {processingLabel}
      </div>
    );
  }
  if (errorMessage !== null) {
    return (
      <div
        role="alert"
        className="rounded-lg bg-danger-bg px-4 py-3 text-sm text-danger-ink"
      >
        ⚠ {errorMessage}
      </div>
    );
  }
  return null;
}
