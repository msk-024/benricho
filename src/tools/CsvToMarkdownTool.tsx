import { useState } from "react";
import type { ReactElement } from "react";
import { CopyButton } from "../components/CopyButton";
import { FileDrop } from "../components/FileDrop";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import { csvToMarkdownTable } from "../lib/csvToMarkdown";
import { downloadBlob } from "../lib/download";
import { baseName } from "../lib/fileName";

/** CSV を Markdown の表に変換する */
export function CsvToMarkdownTool(): ReactElement {
  const [csvText, setCsvText] = useState("");
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [markdownResult, setMarkdownResult] = useState("");
  const [outputBaseName, setOutputBaseName] = useState("table");
  const { isProcessing, errorMessage, run, clearError } = useAsyncTask();

  const handleFiles = (files: File[]): void => {
    const file = files[0];
    run(async () => {
      setCsvText(await decodeCsvFile(file));
      setOutputBaseName(baseName(file.name));
      setMarkdownResult("");
    });
  };

  const handleConvert = (): void => {
    run(async () => {
      setMarkdownResult(csvToMarkdownTable(csvText, { hasHeaderRow }));
    });
  };

  return (
    <div className="space-y-4">
      <FileDrop
        accept=".csv,text/csv,text/plain"
        disabled={isProcessing}
        description="CSVファイル(UTF-8 / Shift_JIS 自動判定)。下のエリアへの貼り付けも可能"
        onFiles={handleFiles}
      />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          CSV
        </span>
        <textarea
          value={csvText}
          onChange={(event) => {
            setCsvText(event.target.value);
            clearError();
          }}
          placeholder={"名前,年齢\n太郎,30"}
          spellCheck={false}
          className="h-40 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm"
        />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={hasHeaderRow}
            onChange={(event) => setHasHeaderRow(event.target.checked)}
            className="accent-sky-600"
          />
          1行目をヘッダーとして扱う
        </label>
        <button
          type="button"
          disabled={isProcessing || csvText.trim() === ""}
          onClick={handleConvert}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
        >
          Markdown表に変換
        </button>
      </div>
      <ToolStatus isProcessing={isProcessing} errorMessage={errorMessage} />
      {markdownResult !== "" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">変換結果</span>
            <div className="flex gap-2">
              <CopyButton text={markdownResult} />
              <button
                type="button"
                onClick={() =>
                  downloadBlob(
                    new Blob([markdownResult], { type: "text/markdown" }),
                    `${outputBaseName}.md`,
                  )
                }
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
              >
                .mdでダウンロード
              </button>
            </div>
          </div>
          <textarea
            value={markdownResult}
            readOnly
            spellCheck={false}
            className="h-48 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm"
          />
        </div>
      )}
    </div>
  );
}

/** CSVファイルを読み込む。UTF-8で文字化けする場合は Shift_JIS として再解釈する */
async function decodeCsvFile(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const utf8Text = new TextDecoder("utf-8").decode(bytes);
  if (!utf8Text.includes("�")) return utf8Text;
  try {
    return new TextDecoder("shift_jis").decode(bytes);
  } catch {
    return utf8Text;
  }
}
