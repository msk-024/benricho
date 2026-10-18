import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { CopyButton } from "../components/CopyButton";
import {
  convertSize,
  formatSizeValue,
  type SizeUnit,
} from "../lib/unitConvert";

const UNIT_OPTIONS: ReadonlyArray<{ value: SizeUnit; label: string }> = [
  { value: "px", label: "px" },
  { value: "rem", label: "rem" },
  { value: "em", label: "em" },
  { value: "pt", label: "pt" },
];

const COMMON_PX_VALUES = [12, 14, 16, 18, 20, 24, 32, 40, 48] as const;

/** px ⇔ rem / em / pt 変換。そのまま貼れるCSS値をコピーできる */
export function UnitConvertTool(): ReactElement {
  const [inputValue, setInputValue] = useState("16");
  const [fromUnit, setFromUnit] = useState<SizeUnit>("px");
  const [baseFontSizeInput, setBaseFontSizeInput] = useState("16");

  const baseFontSizePx = Number(baseFontSizeInput);
  const value = Number(inputValue);
  const isBaseValid = Number.isFinite(baseFontSizePx) && baseFontSizePx > 0;
  const isValueValid = Number.isFinite(value);

  const result = useMemo(() => {
    if (!isValueValid || !isBaseValid) return null;
    return convertSize(value, fromUnit, baseFontSizePx);
  }, [value, fromUnit, baseFontSizePx, isValueValid, isBaseValid]);

  const rows: ReadonlyArray<{ unit: string; css: string }> | null =
    result === null
      ? null
      : [
          { unit: "px", css: `${formatSizeValue(result.px)}px` },
          {
            unit: "rem",
            css: `${formatSizeValue(result.rem)}rem /* ${formatSizeValue(result.px)}px */`,
          },
          {
            unit: "em",
            css: `${formatSizeValue(result.em)}em /* ${formatSizeValue(result.px)}px */`,
          },
          {
            unit: "pt",
            css: `${formatSizeValue(result.pt)}pt /* ${formatSizeValue(result.px)}px */`,
          },
        ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            値
          </span>
          <input
            type="number"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            単位
          </span>
          <select
            value={fromUnit}
            onChange={(event) => setFromUnit(event.target.value as SizeUnit)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            {UNIT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            基準フォントサイズ(px)
          </span>
          <input
            type="number"
            min={1}
            value={baseFontSizeInput}
            onChange={(event) => setBaseFontSizeInput(event.target.value)}
            className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2"
          />
        </label>
      </div>

      {!isValueValid && (
        <p className="text-sm text-red-600">⚠ 値を数値で入力してください</p>
      )}
      {!isBaseValid && (
        <p className="text-sm text-red-600">
          ⚠ 基準フォントサイズは正の数値で入力してください
        </p>
      )}

      {rows !== null && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {rows.map((row) => (
            <li
              key={row.unit}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{row.unit}</p>
                <code className="text-sm text-slate-800">{row.css}</code>
              </div>
              <CopyButton text={row.css} />
            </li>
          ))}
        </ul>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">
          よく使う値の早見表(基準フォントサイズ {baseFontSizeInput}px)
        </h3>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {COMMON_PX_VALUES.map((px) => {
            if (!isBaseValid) return null;
            const remValue = convertSize(px, "px", baseFontSizePx).rem;
            const css = `${formatSizeValue(remValue)}rem /* ${px}px */`;
            return (
              <li
                key={px}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <code className="text-xs text-slate-700">{css}</code>
                <CopyButton text={css} />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
