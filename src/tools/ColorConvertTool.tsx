import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { CHECKER_PATTERN_CLASS } from "../components/checkerBackground";
import { CopyButton } from "../components/CopyButton";
import { LabeledSlider } from "../components/LabeledSlider";
import {
  formatHex,
  formatHslCss,
  formatRgbCss,
  parseHexColor,
  rgbaToHsla,
  type RgbaColor,
} from "../lib/colorConvert";

const DEFAULT_HEX = "#3552c9";

/** 色を6桁HEXに正規化する(ピッカー用、不正ならnull) */
function toPickerHex(hexInput: string): string | null {
  try {
    const rgba = parseHexColor(hexInput);
    return formatHex(rgba);
  } catch {
    return null;
  }
}

/** HEX ⇔ RGB ⇔ HSL 変換。透明度つきでそのまま貼れるCSSをコピーできる */
export function ColorConvertTool(): ReactElement {
  const [hexInput, setHexInput] = useState(DEFAULT_HEX);
  const [alphaPercent, setAlphaPercent] = useState(100);

  // HEX入力自体に埋め込まれたアルファ(#RGBA/#RRGGBBAA)がある場合は、
  // それをスライダーに反映する(そうしないと常にスライダー側の値で上書きされてしまう)
  const handleHexChange = (newHex: string): void => {
    setHexInput(newHex);
    const digits = newHex.trim().replace(/^#/, "");
    if (digits.length !== 4 && digits.length !== 8) return;
    try {
      const parsed = parseHexColor(newHex);
      setAlphaPercent(Math.round(parsed.a * 100));
    } catch {
      // 不正な形式は下の表示側でエラーメッセージを出すのでここでは何もしない
    }
  };

  const color: RgbaColor | null = useMemo(() => {
    try {
      const base = parseHexColor(hexInput);
      return { ...base, a: alphaPercent / 100 };
    } catch {
      return null;
    }
  }, [hexInput, alphaPercent]);

  const hsla = color !== null ? rgbaToHsla(color) : null;
  const pickerHex = toPickerHex(hexInput) ?? "#000000";

  const rows: ReadonlyArray<{ label: string; value: string }> | null =
    color === null || hsla === null
      ? null
      : [
          { label: "HEX", value: formatHex(color, alphaPercent < 100) },
          { label: "RGB", value: formatRgbCss(color) },
          { label: "HSL", value: formatHslCss(hsla) },
        ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">
            カラーピッカー
          </span>
          <input
            type="color"
            value={pickerHex}
            onChange={(event) => handleHexChange(event.target.value)}
            className="h-10 w-16 cursor-pointer rounded-lg border border-line-strong bg-surface p-1"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">HEX</span>
          <input
            type="text"
            value={hexInput}
            onChange={(event) => handleHexChange(event.target.value)}
            placeholder="#3552c9"
            className="w-36 rounded-lg border border-line-strong bg-surface px-3 py-2 font-mono"
          />
        </label>
      </div>

      <LabeledSlider
        label="不透明度"
        min={0}
        max={100}
        step={1}
        value={alphaPercent}
        unit="%"
        onChange={setAlphaPercent}
      />

      {rows === null ? (
        <p className="text-sm text-danger-ink-soft">
          ⚠ HEXカラーの形式が不正です(例: #3552c9)
        </p>
      ) : (
        <ul className="divide-y divide-line-subtle rounded-lg border border-line bg-surface">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-xs text-muted">{row.label}</p>
                <code className="text-sm text-ink-strong">{row.value}</code>
              </div>
              <CopyButton text={row.value} />
            </li>
          ))}
        </ul>
      )}

      {color !== null && (
        <div
          className={`h-20 w-full rounded-lg border border-line ${CHECKER_PATTERN_CLASS}`}
        >
          <div
            className="size-full rounded-lg"
            style={{
              backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`,
            }}
          />
        </div>
      )}
    </div>
  );
}
