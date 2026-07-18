import { marked } from "marked";

/**
 * Markdown を GFM として HTML 断片に変換する。
 *
 * @postcondition 戻り値は HTML 文字列(サニタイズは呼び出し側の責務)
 */
export function markdownToHtmlFragment(markdown: string): string {
  return marked.parse(markdown, { gfm: true, breaks: true, async: false });
}

/**
 * Markdown をスタイル込みのスタンドアロン HTML 文書に変換する。
 * PDF 書き出しのキャプチャでも同じ CSS を使うため、色は 16 進表記のみで記述している。
 *
 * @precondition title は文書タイトルとして使う文字列
 * @postcondition 戻り値は単体で開ける完全な HTML 文書
 */
export function markdownToHtmlDocument(
  markdown: string,
  title: string,
): string {
  const body = markdownToHtmlFragment(markdown);
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
${MARKDOWN_DOCUMENT_CSS}
</style>
</head>
<body>
<main class="markdown-body">
${body}
</main>
</body>
</html>
`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** GitHub 風の最小スタイル。html2canvas 互換のため色は 16 進のみ使用 */
export const MARKDOWN_DOCUMENT_CSS = `
.markdown-body {
  font-family: -apple-system, "Segoe UI", "Hiragino Kaku Gothic ProN", "Noto Sans JP", Meiryo, sans-serif;
  font-size: 16px;
  line-height: 1.75;
  color: #1f2328;
  background-color: #ffffff;
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 24px;
  word-wrap: break-word;
}
.markdown-body h1, .markdown-body h2, .markdown-body h3,
.markdown-body h4, .markdown-body h5, .markdown-body h6 {
  margin-top: 1.5em;
  margin-bottom: 0.6em;
  font-weight: 600;
  line-height: 1.3;
}
.markdown-body h1 { font-size: 1.75em; border-bottom: 1px solid #d1d9e0; padding-bottom: 0.3em; }
.markdown-body h2 { font-size: 1.4em; border-bottom: 1px solid #d1d9e0; padding-bottom: 0.3em; }
.markdown-body h3 { font-size: 1.2em; }
.markdown-body p { margin: 0 0 1em; }
.markdown-body ul, .markdown-body ol { margin: 0 0 1em; padding-left: 2em; }
.markdown-body li { margin: 0.25em 0; }
.markdown-body blockquote {
  margin: 0 0 1em;
  padding: 0.25em 1em;
  color: #59636e;
  border-left: 4px solid #d1d9e0;
}
.markdown-body code {
  font-family: Consolas, "Courier New", monospace;
  font-size: 0.9em;
  background-color: #f0f1f2;
  border-radius: 4px;
  padding: 0.15em 0.4em;
}
.markdown-body pre {
  background-color: #f6f8fa;
  border-radius: 6px;
  padding: 14px;
  overflow-x: auto;
  margin: 0 0 1em;
}
.markdown-body pre code { background-color: transparent; padding: 0; }
.markdown-body table { border-collapse: collapse; margin: 0 0 1em; }
.markdown-body th, .markdown-body td { border: 1px solid #d1d9e0; padding: 6px 13px; }
.markdown-body th { background-color: #f6f8fa; font-weight: 600; }
.markdown-body img { max-width: 100%; }
.markdown-body hr { border: 0; border-top: 2px solid #d1d9e0; margin: 1.5em 0; }
.markdown-body a { color: #0969da; }
`;
