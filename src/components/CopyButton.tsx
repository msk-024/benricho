import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";

interface CopyButtonProps {
  text: string;
  disabled?: boolean;
}

/** クリップボードへのコピーと完了フィードバック */
export function CopyButton({
  text,
  disabled = false,
}: CopyButtonProps): ReactElement {
  const [feedback, setFeedback] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const showFeedback = (state: "copied" | "failed"): void => {
    setFeedback(state);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setFeedback("idle"), 2000);
  };

  const handleCopy = (): void => {
    void navigator.clipboard
      .writeText(text)
      .then(() => showFeedback("copied"))
      .catch(() => showFeedback("failed"));
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled || text === ""}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {feedback === "copied"
        ? "✓ コピーしました"
        : feedback === "failed"
          ? "コピー失敗"
          : "コピー"}
    </button>
  );
}
