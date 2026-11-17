import { useState } from "react";
import type { ReactElement } from "react";
import { CopyButton } from "../components/CopyButton";
import { FileDrop } from "../components/FileDrop";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import { downloadBlob } from "../lib/download";
import { excelToMarkdown } from "../lib/excelToMarkdown";
import { baseName } from "../lib/fileName";

/** Excel(.xlsx) の各シートをMarkdownの表に変換する(AIに読み込ませやすくする用途) */
export function ExcelToMarkdownTool(): ReactElement {
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [markdownResult, setMarkdownResult] = useState("");
  const [outputBaseName, setOutputBaseName] = useState("document");
  const { isProcessing, errorMessage, run } = useAsyncTask();

  const handleFiles = (files: File[]): void => {
    const file = files[0];
    run(async () => {
      const markdown = await excelToMarkdown(await file.arrayBuffer(), {
        hasHeaderRow,
      });
      setMarkdownResult(markdown);
      setOutputBaseName(baseName(file.name));
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Excel(.xlsx)の各シートを「##
        シート名」見出し+Markdownの表に変換します(.xls形式は非対応)。数式は計算結果の値に変換されます。
      </p>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={hasHeaderRow}
          onChange={(event) => setHasHeaderRow(event.target.checked)}
          className="accent-action-primary"
        />
        各シートの1行目をヘッダーとして扱う
      </label>
      <FileDrop
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        disabled={isProcessing}
        description="Excelファイル(.xlsx、1ファイル)"
        onFiles={handleFiles}
      />
      <ToolStatus
        isProcessing={isProcessing}
        errorMessage={errorMessage}
        processingLabel="変換中…"
      />
      {markdownResult !== "" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink">変換結果</span>
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
                className="rounded-lg bg-action-primary px-3 py-1.5 text-sm font-medium text-ink-inverted hover:bg-action-primary-hover"
              >
                .mdでダウンロード
              </button>
            </div>
          </div>
          <textarea
            value={markdownResult}
            readOnly
            spellCheck={false}
            className="h-80 w-full resize-y rounded-lg border border-line bg-surface-muted p-3 font-mono text-sm"
          />
        </div>
      )}
    </div>
  );
}
