/**
 * 透過確認用の市松模様の背景(Tailwind任意値)。
 * スタンプ枠編集・プレビューなど、透過画像の確認が必要な箇所で共有する。
 * 色は --color-checker-a / --color-checker-b トークンを参照しているため、
 * ダークモードでも(src/index.css側の定義に従って)自動で切り替わる。
 */
export const CHECKER_PATTERN_CLASS =
  "bg-[repeating-conic-gradient(var(--color-checker-a)_0%_25%,var(--color-checker-b)_0%_50%)] bg-size-[16px_16px]";
