import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { CopyButton } from "../components/CopyButton";
import {
  computeHeightFromRatio,
  simplifyRatio,
  type AspectRatio,
} from "../lib/aspectRatio";

const RATIO_PRESETS = [
  { id: "16:9", label: "16:9", w: 16, h: 9 },
  { id: "4:3", label: "4:3", w: 4, h: 3 },
  { id: "1:1", label: "1:1", w: 1, h: 1 },
  { id: "4:5", label: "4:5", w: 4, h: 5 },
  { id: "3:4", label: "3:4", w: 3, h: 4 },
  { id: "9:16", label: "9:16", w: 9, h: 16 },
  { id: "custom", label: "自由入力", w: 0, h: 0 },
] as const;

type RatioPresetId = (typeof RATIO_PRESETS)[number]["id"];
type Mode = "fromRatio" | "fromDimensions";

function formatRatioValue(value: number): string {
  return Number(value.toFixed(2)).toString();
}

/** 横幅と比率から高さを計算する/幅と高さから比率を約分する。そのまま貼れるCSSをコピーできる */
export function AspectRatioTool(): ReactElement {
  const [mode, setMode] = useState<Mode>("fromRatio");

  // 「幅から高さを計算」モード
  const [widthInput, setWidthInput] = useState("1920");
  const [presetId, setPresetId] = useState<RatioPresetId>("16:9");
  const [customRatioW, setCustomRatioW] = useState("16");
  const [customRatioH, setCustomRatioH] = useState("9");

  // 「幅と高さから比率を出す」モード
  const [dimWidthInput, setDimWidthInput] = useState("1920");
  const [dimHeightInput, setDimHeightInput] = useState("1080");

  const width = Number(widthInput);
  const preset = RATIO_PRESETS.find((candidate) => candidate.id === presetId);
  const ratioW =
    preset !== undefined && preset.id !== "custom"
      ? preset.w
      : Number(customRatioW);
  const ratioH =
    preset !== undefined && preset.id !== "custom"
      ? preset.h
      : Number(customRatioH);
  const ratio: AspectRatio = { w: ratioW, h: ratioH };

  const heightResult = useMemo(() => {
    try {
      return computeHeightFromRatio(width, { w: ratioW, h: ratioH });
    } catch {
      return null;
    }
  }, [width, ratioW, ratioH]);

  const dimWidth = Number(dimWidthInput);
  const dimHeight = Number(dimHeightInput);
  const simplifiedResult = useMemo(() => {
    try {
      return simplifyRatio(dimWidth, dimHeight);
    } catch {
      return null;
    }
  }, [dimWidth, dimHeight]);

  const heightHasFraction =
    heightResult !== null && !Number.isInteger(heightResult);

  return (
    <div className="space-y-4">
      <div
        className="flex gap-1 rounded-lg bg-line-subtle p-1"
        role="tablist"
        aria-label="計算モード"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "fromRatio"}
          onClick={() => setMode("fromRatio")}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium ${
            mode === "fromRatio"
              ? "bg-surface text-ink-strong shadow-sm"
              : "text-muted"
          }`}
        >
          幅から高さを計算
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "fromDimensions"}
          onClick={() => setMode("fromDimensions")}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium ${
            mode === "fromDimensions"
              ? "bg-surface text-ink-strong shadow-sm"
              : "text-muted"
          }`}
        >
          幅と高さから比率を出す
        </button>
      </div>

      {mode === "fromRatio" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                横幅(px)
              </span>
              <input
                type="number"
                min={0}
                value={widthInput}
                onChange={(event) => setWidthInput(event.target.value)}
                className="w-32 rounded-lg border border-line-strong bg-surface px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                比率
              </span>
              <select
                value={presetId}
                onChange={(event) =>
                  setPresetId(event.target.value as RatioPresetId)
                }
                className="rounded-lg border border-line-strong bg-surface px-3 py-2"
              >
                {RATIO_PRESETS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {presetId === "custom" && (
              <div className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="number"
                  min={1}
                  value={customRatioW}
                  onChange={(event) => setCustomRatioW(event.target.value)}
                  className="w-16 rounded-lg border border-line-strong px-2 py-1.5"
                />
                :
                <input
                  type="number"
                  min={1}
                  value={customRatioH}
                  onChange={(event) => setCustomRatioH(event.target.value)}
                  className="w-16 rounded-lg border border-line-strong px-2 py-1.5"
                />
              </div>
            )}
          </div>

          {heightResult === null ? (
            <p className="text-sm text-danger-ink-soft">
              ⚠ 横幅と比率は正の数値で入力してください
            </p>
          ) : (
            <>
              {heightHasFraction && (
                <p className="rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn-ink">
                  ⚠
                  高さが割り切れず小数になっています(表示上は丸められる場合があります)
                </p>
              )}
              <ul className="divide-y divide-line-subtle rounded-lg border border-line bg-surface">
                <li className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <code className="text-sm text-ink-strong">
                    aspect-ratio: {ratio.w} / {ratio.h};
                  </code>
                  <CopyButton text={`aspect-ratio: ${ratio.w} / ${ratio.h};`} />
                </li>
                <li className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <code className="text-sm text-ink-strong">
                    height: {formatRatioValue(heightResult)}px;
                  </code>
                  <CopyButton
                    text={`height: ${formatRatioValue(heightResult)}px;`}
                  />
                </li>
              </ul>
            </>
          )}
        </div>
      )}

      {mode === "fromDimensions" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                横幅(px)
              </span>
              <input
                type="number"
                min={0}
                value={dimWidthInput}
                onChange={(event) => setDimWidthInput(event.target.value)}
                className="w-32 rounded-lg border border-line-strong bg-surface px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                高さ(px)
              </span>
              <input
                type="number"
                min={0}
                value={dimHeightInput}
                onChange={(event) => setDimHeightInput(event.target.value)}
                className="w-32 rounded-lg border border-line-strong bg-surface px-3 py-2"
              />
            </label>
          </div>

          {simplifiedResult === null ? (
            <p className="text-sm text-danger-ink-soft">
              ⚠ 横幅と高さは正の数値で入力してください
            </p>
          ) : (
            <ul className="divide-y divide-line-subtle rounded-lg border border-line bg-surface">
              <li className="flex items-center justify-between gap-3 px-4 py-2.5">
                <p className="text-sm text-ink-strong">
                  比率:{" "}
                  <span className="font-mono font-semibold">
                    {simplifiedResult.w}:{simplifiedResult.h}
                  </span>
                </p>
                <CopyButton
                  text={`${simplifiedResult.w}:${simplifiedResult.h}`}
                />
              </li>
              <li className="flex items-center justify-between gap-3 px-4 py-2.5">
                <code className="text-sm text-ink-strong">
                  aspect-ratio: {simplifiedResult.w} / {simplifiedResult.h};
                </code>
                <CopyButton
                  text={`aspect-ratio: ${simplifiedResult.w} / ${simplifiedResult.h};`}
                />
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
