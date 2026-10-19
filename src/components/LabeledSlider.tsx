import type { ReactElement } from "react";

interface LabeledSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

/** ラベルと現在値表示つきのスライダー入力 */
export function LabeledSlider({
  label,
  min,
  max,
  step,
  value,
  unit = "",
  disabled = false,
  onChange,
}: LabeledSliderProps): ReactElement {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-sm text-ink">
        <span>{label}</span>
        <span className="font-mono text-muted">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-action-primary"
      />
    </label>
  );
}
