import { useState } from "react";
import type { ReactElement } from "react";
import { CopyButton } from "../components/CopyButton";
import { FileDrop } from "../components/FileDrop";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import { downloadBlob } from "../lib/download";
import { baseName } from "../lib/fileName";
import { wordToMarkdown } from "../lib/wordToMarkdown";

/** Word(.docx) を見出し・リスト・表を保持したままMarkdownに変換する(AIに読み込ませやすくする用途) */
export function WordToMarkdownTool(): ReactElement {
  const [markdownResult, setMarkdownResult] = useState("");
  const [outputBaseName, setOutputBaseName] = useState("document");
  const { isProcessing, errorMessage, run } = useAsyncTask();

  const handleFiles = (files: File[]): void => {
    const file = files[0];
    run(async () => {
      const markdown = await wordToMarkdown(await file.arrayBuffer());
      setMarkdownResult(markdown);
      setOutputBaseName(baseName(file.name));
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Word(.docx)を見出し・リスト・強調・表を保持したままMarkdownに変換します(.doc形式は非対応)。画像は変換結果に含まれません。
      </p>
      <FileDrop
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        disabled={isProcessing}
        description="Wordファイル(.docx、1ファイル)"
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
