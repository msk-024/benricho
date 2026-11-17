import { useState } from "react";
import type { ReactElement } from "react";
import { CopyButton } from "../components/CopyButton";
import { FileDrop } from "../components/FileDrop";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import { downloadBlob } from "../lib/download";
import { baseName } from "../lib/fileName";
import { pdfToMarkdown } from "../lib/pdfToMarkdown";

/** PDF のテキストを抽出してMarkdownに変換する(AIに読み込ませやすくする用途) */
export function PdfToMarkdownTool(): ReactElement {
  const [insertPageHeadings, setInsertPageHeadings] = useState(true);
  const [markdownResult, setMarkdownResult] = useState("");
  const [outputBaseName, setOutputBaseName] = useState("document");
  const { isProcessing, errorMessage, run } = useAsyncTask();

  const handleFiles = (files: File[]): void => {
    const file = files[0];
    run(async () => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const markdown = await pdfToMarkdown(bytes, { insertPageHeadings });
      setMarkdownResult(markdown);
      setOutputBaseName(baseName(file.name));
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        PDF内のテキストを抽出してMarkdown化します。PDFには見出し等の構造情報がないため、実質的にプレーンテキスト(ページ区切りのみ保持)になります。画像だけのPDF(スキャン画像など)はテキストを抽出できません。
      </p>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={insertPageHeadings}
          onChange={(event) => setInsertPageHeadings(event.target.checked)}
          className="accent-action-primary"
        />
        ページ区切りを見出し(## ページ N)として挿入する
      </label>
      <FileDrop
        accept="application/pdf,.pdf"
        disabled={isProcessing}
        description="PDFファイル(1ファイル)"
        onFiles={handleFiles}
      />
      <ToolStatus
        isProcessing={isProcessing}
        errorMessage={errorMessage}
        processingLabel="テキストを抽出中…"
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
