import { useRef, useState } from "react";
import type { DragEvent, ChangeEvent, ReactElement } from "react";
import { matchesAccept } from "../lib/fileName";

interface FileDropProps {
  /** input の accept 属性(例: "image/png,image/jpeg") */
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  description: string;
  onFiles: (files: File[]) => void;
}

/**
 * 「ドラッグ&ドロップ or クリックで選択」の共通ファイル入力コンポーネント。
 *
 * @postcondition ファイルが 1 件以上選択されたときのみ onFiles を呼ぶ
 */
export function FileDrop({
  accept,
  multiple = false,
  disabled = false,
  description,
  onFiles,
}: FileDropProps): ReactElement {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const emitFiles = (files: File[]): void => {
    if (files.length === 0) return;
    onFiles(files);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    // input[accept]/[multiple] はネイティブのファイル選択ダイアログにしか
    // 効かないため、ドロップされたファイルはここで明示的に絞り込む
    const matched = Array.from(event.dataTransfer.files).filter((file) =>
      matchesAccept(file.name, file.type, accept),
    );
    emitFiles(multiple ? matched : matched.slice(0, 1));
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    emitFiles(Array.from(event.target.files ?? []));
    // 同じファイルを選び直しても change が発火するようにリセットする
    event.target.value = "";
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`w-full rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragOver
            ? "border-info-border bg-info-bg"
            : "border-line-strong bg-surface hover:border-info-border-soft hover:bg-surface-muted"
        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <p className="text-sm font-medium text-ink">
          ファイルをドラッグ&ドロップ、またはクリックして選択
        </p>
        <p className="mt-1 text-xs text-muted">{description}</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
      />
    </>
  );
}
