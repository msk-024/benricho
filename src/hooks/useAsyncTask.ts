import { useCallback, useState } from "react";

export interface AsyncTaskState {
  isProcessing: boolean;
  errorMessage: string | null;
  /** 非同期処理を実行し、例外はエラーメッセージとして状態に反映する */
  run: (task: () => Promise<void>) => void;
  clearError: () => void;
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message !== "") return error.message;
  return `予期しないエラーが発生しました: ${String(error)}`;
}

/**
 * ツール共通の「処理中 / エラー」状態管理フック。
 *
 * @postcondition run 中の例外は throw されず errorMessage に格納される
 * @invariant isProcessing 中の再実行は無視される(多重実行防止)
 */
export function useAsyncTask(): AsyncTaskState {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const run = useCallback(
    (task: () => Promise<void>) => {
      if (isProcessing) return;
      setIsProcessing(true);
      setErrorMessage(null);
      void task()
        .catch((error: unknown) => setErrorMessage(toErrorMessage(error)))
        .finally(() => setIsProcessing(false));
    },
    [isProcessing],
  );

  const clearError = useCallback(() => setErrorMessage(null), []);

  return { isProcessing, errorMessage, run, clearError };
}
