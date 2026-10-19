import DOMPurify from "dompurify";
import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { FileDrop } from "../components/FileDrop";
import { ToolStatus } from "../components/ToolStatus";
import { useAsyncTask } from "../hooks/useAsyncTask";
import { markdownToPdfBlob } from "../lib/canvas/markdownPdf";
import { downloadBlob } from "../lib/download";
import { baseName } from "../lib/fileName";
import { markdownToDocxBlob } from "../lib/markdownDocx";
import {
  MARKDOWN_DOCUMENT_CSS,
  markdownToHtmlDocument,
  markdownToHtmlFragment,
} from "../lib/markdownHtml";
import { decodeTextWithEncodingFallback } from "../lib/textDecode";

const SAMPLE_MARKDOWN = `# 見出し1

これは **太字** と *斜体* と \`コード\` の例です。

## リスト

- 項目A
- 項目B

1. 手順1
2. 手順2

| 列1 | 列2 |
| --- | --- |
| あ | い |
`;

/** Markdown を Word(.docx) / PDF / HTML に変換する */
export function MarkdownConvertTool(): ReactElement {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN);
  const [outputBaseName, setOutputBaseName] = useState("document");
  const { isProcessing, errorMessage, run } = useAsyncTask();

  const previewHtml = useMemo(
    () => DOMPurify.sanitize(markdownToHtmlFragment(markdown)),
    [markdown],
  );

  const handleFiles = (files: File[]): void => {
    const file = files[0];
    run(async () => {
      setMarkdown(decodeTextWithEncodingFallback(await file.arrayBuffer()));
      setOutputBaseName(baseName(file.name));
    });
  };

  const assertNotEmpty = (): void => {
    if (markdown.trim() === "")
      throw new RangeError("Markdownを入力してください");
  };

  const handleDownloadDocx = (): void => {
    run(async () => {
      assertNotEmpty();
      downloadBlob(
        await markdownToDocxBlob(markdown),
        `${outputBaseName}.docx`,
      );
    });
  };

  const handleDownloadPdf = (): void => {
    run(async () => {
      assertNotEmpty();
      downloadBlob(await markdownToPdfBlob(markdown), `${outputBaseName}.pdf`);
    });
  };

  const handleDownloadHtml = (): void => {
    run(async () => {
      assertNotEmpty();
      const htmlText = markdownToHtmlDocument(markdown, outputBaseName);
      downloadBlob(
        new Blob([htmlText], { type: "text/html" }),
        `${outputBaseName}.html`,
      );
    });
  };

  return (
    <div className="space-y-4">
      <FileDrop
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        disabled={isProcessing}
        description=".md / .txt ファイルを読み込み(下のエリアへの直接入力・編集も可能)"
        onFiles={handleFiles}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">
            Markdown
          </span>
          <textarea
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            spellCheck={false}
            className="h-80 w-full resize-y rounded-lg border border-line-strong bg-surface p-3 font-mono text-sm"
          />
        </label>
        <div>
          <span className="mb-1 block text-sm font-medium text-ink">
            プレビュー
          </span>
          <style>{MARKDOWN_DOCUMENT_CSS}</style>
          {/* 書き出し(Word/PDF/HTML)と同じ見た目を保証するプレビューのため、
              アプリのテーマに関わらず常にライト固定(リテラル)のまま */}
          <div
            className="h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white"
            // DOMPurify で無害化済みのHTMLのみを流し込む
            dangerouslySetInnerHTML={{
              __html: `<div class="markdown-body">${previewHtml}</div>`,
            }}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        出力ファイル名
        <input
          type="text"
          value={outputBaseName}
          onChange={(event) => setOutputBaseName(event.target.value)}
          className="w-56 rounded-lg border border-line-strong px-3 py-1.5"
        />
        <span className="text-subtle">.docx / .pdf / .html</span>
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isProcessing}
          onClick={handleDownloadDocx}
          className="rounded-lg bg-action-primary px-4 py-2 text-sm font-medium text-ink-inverted hover:bg-action-primary-hover disabled:opacity-50"
        >
          Word(.docx)でダウンロード
        </button>
        <button
          type="button"
          disabled={isProcessing}
          onClick={handleDownloadPdf}
          className="rounded-lg bg-action-primary px-4 py-2 text-sm font-medium text-ink-inverted hover:bg-action-primary-hover disabled:opacity-50"
        >
          PDFでダウンロード
        </button>
        <button
          type="button"
          disabled={isProcessing}
          onClick={handleDownloadHtml}
          className="rounded-lg bg-action-primary px-4 py-2 text-sm font-medium text-ink-inverted hover:bg-action-primary-hover disabled:opacity-50"
        >
          HTMLでダウンロード
        </button>
      </div>
      <p className="text-xs text-muted">
        ※
        PDFはブラウザ描画を画像化する方式のため、PDF内のテキスト選択はできません(日本語対応のためのトレードオフ)
      </p>
      <ToolStatus
        isProcessing={isProcessing}
        errorMessage={errorMessage}
        processingLabel="変換中…"
      />
    </div>
  );
}
