import { Component } from "react";
import type { ReactElement, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * 1つのツールでの予期しない例外(useAsyncTask経由の非同期エラーではなく、
 * レンダリング中に投げられた例外)がアプリ全体を巻き込まないための最上位境界。
 * key={selectedTool.id} で包むことで、ツール切替時に自動的にエラー状態がリセットされる
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  render(): ReactNode {
    const { error } = this.state;
    if (error !== null) return <ErrorFallback error={error} />;
    return this.props.children;
  }
}

function ErrorFallback({ error }: { error: Error }): ReactElement {
  return (
    <div
      role="alert"
      className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-6"
    >
      <p className="text-sm font-medium text-red-800">
        このツールで予期しないエラーが発生しました
      </p>
      <p className="text-xs text-red-600">{error.message}</p>
      <p className="text-xs text-red-500">
        サイドバーから別のツールを選ぶか、ページを再読み込みしてください
      </p>
    </div>
  );
}
