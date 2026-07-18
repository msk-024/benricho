import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import {
  TOOL_CATEGORIES,
  TOOL_DEFINITIONS,
  type ToolDefinition,
} from "./tools/registry";

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
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      <aside className="border-b border-slate-200 bg-white p-4 lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <h1 className="mb-4 text-lg font-bold text-slate-800">🧰 便利帳</h1>

        {/* モバイル: セレクトボックスで切替 */}
        <label className="block lg:hidden">
          <span className="sr-only">ツールを選択</span>
          <select
            value={selectedTool.id}
            onChange={(event) => selectTool(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
              <h2 className="mb-1 px-2 text-xs font-semibold tracking-wide text-slate-400">
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
                          ? "bg-sky-100 font-medium text-sky-800"
                          : "text-slate-600 hover:bg-slate-100"
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

      <main className="mx-auto w-full max-w-3xl flex-1 p-4 lg:p-8">
        <header className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            {selectedTool.name}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {selectedTool.description}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            すべての処理はブラウザ内で完結し、ファイルが外部に送信されることはありません
          </p>
        </header>
        <ActiveTool key={selectedTool.id} />
      </main>
    </div>
  );
}

export default App;
