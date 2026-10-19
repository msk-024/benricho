import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { CopyButton } from "../components/CopyButton";
import { downloadBlob } from "../lib/download";
import {
  countText,
  normalizeText,
  type AsciiMode,
  type KanaMode,
  type SpaceMode,
} from "../lib/textNormalize";

/** 文字数カウントと全角半角の統一変換 */
export function TextCountTool(): ReactElement {
  const [inputText, setInputText] = useState("");
  const [asciiMode, setAsciiMode] = useState<AsciiMode>("toHalf");
  const [kanaMode, setKanaMode] = useState<KanaMode>("toFull");
  const [spaceMode, setSpaceMode] = useState<SpaceMode>("keep");
  const [resultText, setResultText] = useState("");

  const counts = useMemo(() => countText(inputText), [inputText]);

  const handleConvert = (): void => {
    setResultText(
      normalizeText(inputText, {
        ascii: asciiMode,
        kana: kanaMode,
        space: spaceMode,
      }),
    );
  };

  const countEntries: ReadonlyArray<[label: string, value: number]> = [
    ["総文字数", counts.totalChars],
    ["空白除く", counts.charsWithoutWhitespace],
    ["全角", counts.fullWidthChars],
    ["半角", counts.halfWidthChars],
    ["行数", counts.lineCount],
    ["UTF-8バイト数", counts.utf8Bytes],
  ];

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink">
          テキスト
        </span>
        <textarea
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          placeholder="ここに入力または貼り付け"
          className="h-48 w-full resize-y rounded-lg border border-line-strong bg-surface p-3 text-sm"
        />
      </label>
      <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {countEntries.map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-center"
          >
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="font-mono text-lg font-semibold text-ink-strong">
              {value.toLocaleString()}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-end gap-3 text-sm text-ink">
        <label className="block">
          <span className="mb-1 block text-xs text-muted">英数字・記号</span>
          <select
            value={asciiMode}
            onChange={(event) => setAsciiMode(event.target.value as AsciiMode)}
            className="rounded-lg border border-line-strong bg-surface px-3 py-2"
          >
            <option value="keep">そのまま</option>
            <option value="toHalf">半角に統一</option>
            <option value="toFull">全角に統一</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">カタカナ</span>
          <select
            value={kanaMode}
            onChange={(event) => setKanaMode(event.target.value as KanaMode)}
            className="rounded-lg border border-line-strong bg-surface px-3 py-2"
          >
            <option value="keep">そのまま</option>
            <option value="toFull">全角に統一</option>
            <option value="toHalf">半角に統一</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">スペース</span>
          <select
            value={spaceMode}
            onChange={(event) => setSpaceMode(event.target.value as SpaceMode)}
            className="rounded-lg border border-line-strong bg-surface px-3 py-2"
          >
            <option value="keep">そのまま</option>
            <option value="toHalf">半角に統一</option>
            <option value="toFull">全角に統一</option>
          </select>
        </label>
        <button
          type="button"
          disabled={inputText === ""}
          onClick={handleConvert}
          className="rounded-lg bg-action-primary px-4 py-2 font-medium text-ink-inverted hover:bg-action-primary-hover disabled:opacity-50"
        >
          変換実行
        </button>
      </div>
      {resultText !== "" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink">変換結果</span>
            <div className="flex gap-2">
              <CopyButton text={resultText} />
              <button
                type="button"
                onClick={() =>
                  downloadBlob(
                    new Blob([resultText], { type: "text/plain" }),
                    "normalized.txt",
                  )
                }
                className="rounded-lg bg-action-primary px-3 py-1.5 text-sm font-medium text-ink-inverted hover:bg-action-primary-hover"
              >
                .txtでダウンロード
              </button>
            </div>
          </div>
          <textarea
            value={resultText}
            readOnly
            className="h-40 w-full resize-y rounded-lg border border-line bg-surface-muted p-3 text-sm"
          />
        </div>
      )}
    </div>
  );
}
