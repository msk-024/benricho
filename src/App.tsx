import { Suspense, useEffect, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToolStatus } from "./components/ToolStatus";
import { useThemePreference } from "./hooks/useThemePreference";
import { isThemePreference } from "./lib/theme";
import {
  TOOL_CATEGORIES,
  TOOL_DEFINITIONS,
  type ToolDefinition,
} from "./tools/registry";

const THEME_OPTIONS = [
  { value: "system", label: "自動" },
  { value: "light", label: "ライト" },
  { value: "dark", label: "ダーク" },
] as const;

const DEFAULT_TOOL_ID = TOOL_DEFINITIONS[0].id;

/** location.hash から有効なツールIDを取り出す。不正な値はデフォルトにフォールバックする */
function toolIdFromHash(): string {
  const hashId = window.location.hash.replace(/^#/, "");
  return TOOL_DEFINITIONS.some((tool) => tool.id === hashId)
    ? hashId
    : DEFAULT_TOOL_ID;
}

function findToolById(toolId: string): ToolDefinition {
  const tool = TOOL_DEFINITIONS.find((candidate) => candidate.id === toolId);
  return tool ?? TOOL_DEFINITIONS[0];
}

/** ツール一覧サイドバー + 選択中ツール表示。選択状態は location.hash と同期する */
function App(): ReactElement {
  const [selectedToolId, setSelectedToolId] = useState<string>(toolIdFromHash);
  const [themePreference, setThemePreference] = useThemePreference();

  const handleThemeChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const { value } = event.target;
    if (isThemePreference(value)) setThemePreference(value);
  };

  useEffect(() => {
    const handleHashChange = (): void => setSelectedToolId(toolIdFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const selectTool = (toolId: string): void => {
    setSelectedToolId(toolId);
    window.location.hash = toolId;
  };

  const selectedTool = findToolById(selectedToolId);
  const ActiveTool = selectedTool.component;

  return (
    <div className="min-h-screen bg-canvas text-ink-strong lg:flex">
      <aside className="border-b border-line bg-surface p-4 lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-ink-strong">🧰 便利帳</h1>
          <label>
            <span className="sr-only">テーマ</span>
            <select
              value={themePreference}
              onChange={handleThemeChange}
              className="rounded-lg border border-line-strong bg-surface px-2 py-1 text-xs text-ink"
            >
              {THEME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* モバイル: セレクトボックスで切替 */}
        <label className="block lg:hidden">
          <span className="sr-only">ツールを選択</span>
          <select
            value={selectedTool.id}
            onChange={(event) => selectTool(event.target.value)}
            className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm"
          >
            {TOOL_CATEGORIES.map((category) => (
              <optgroup key={category} label={category}>
                {TOOL_DEFINITIONS.filter(
                  (tool) => tool.category === category,
                ).map((tool) => (
                  <option key={tool.id} value={tool.id}>
                    {tool.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        {/* デスクトップ: カテゴリ別サイドバー */}
        <nav className="hidden lg:block">
          {TOOL_CATEGORIES.map((category) => (
            <div key={category} className="mb-4">
              <h2 className="mb-1 px-2 text-xs font-semibold tracking-wide text-subtle">
                {category}
              </h2>
              <ul className="space-y-0.5">
                {TOOL_DEFINITIONS.filter(
                  (tool) => tool.category === category,
                ).map((tool) => (
                  <li key={tool.id}>
                    <button
                      type="button"
                      onClick={() => selectTool(tool.id)}
                      aria-current={tool.id === selectedTool.id}
                      className={`w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                        tool.id === selectedTool.id
                          ? "bg-action-primary-soft font-medium text-action-primary-soft-ink"
                          : "text-ink-soft hover:bg-line-subtle"
                      }`}
                    >
                      {tool.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <main
        className={`mx-auto w-full flex-1 p-4 lg:p-8 ${selectedTool.wide ? "max-w-6xl" : "max-w-3xl"}`}
      >
        <header className="mb-6">
          <h2 className="text-xl font-bold text-ink-strong">
            {selectedTool.name}
          </h2>
          <p className="mt-1 text-sm text-muted">{selectedTool.description}</p>
          <p className="mt-1 text-xs text-subtle">
            すべての処理はブラウザ内で完結し、ファイルが外部に送信されることはありません
          </p>
        </header>
        <ErrorBoundary key={selectedTool.id}>
          <Suspense
            fallback={
              <ToolStatus
                isProcessing
                errorMessage={null}
                processingLabel="ツールを読み込み中…"
              />
            }
          >
            <ActiveTool />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;
