import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";
import { createStampFrameId, type StampFrame } from "../lib/stampFrame";

type ResizeCorner = "nw" | "ne" | "sw" | "se";

type DragState =
  | { type: "move"; frameId: string; start: Point; startFrame: StampFrame }
  | {
      type: "resize";
      frameId: string;
      corner: ResizeCorner;
      start: Point;
      startFrame: StampFrame;
    }
  | { type: "create"; start: Point; current: Point };

interface Point {
  x: number;
  y: number;
}

/** 新規追加/リサイズ後のフレームが小さすぎて無効化されないための最小サイズ(自然px) */
const MIN_FRAME_SIZE = 8;

interface StampFrameOverlayProps {
  sourceCanvas: HTMLCanvasElement;
  frames: readonly StampFrame[];
  selectedFrameIds: ReadonlySet<string>;
  disabled?: boolean;
  maxDisplayWidth?: number;
  onFramesChange: (frames: StampFrame[]) => void;
  onToggleSelect: (frameId: string) => void;
}

/**
 * シート画像の上に検出/編集済みの枠をオーバーレイ表示し、
 * 移動・リサイズ・新規追加・削除・選択(結合用)を可能にするエディタ。
 *
 * @precondition sourceCanvas は幅・高さとも1以上
 * @postcondition onFramesChange に渡す矩形は常に画像内に収まる
 */
export function StampFrameOverlay({
  sourceCanvas,
  frames,
  selectedFrameIds,
  disabled = false,
  maxDisplayWidth = 720,
  onFramesChange,
  onToggleSelect,
}: StampFrameOverlayProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const naturalWidth = sourceCanvas.width;
  const naturalHeight = sourceCanvas.height;
  const scale = Math.min(1, maxDisplayWidth / naturalWidth);
  const displayWidth = Math.round(naturalWidth * scale);
  const displayHeight = Math.round(naturalHeight * scale);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    const context = canvas.getContext("2d");
    context?.drawImage(sourceCanvas, 0, 0, displayWidth, displayHeight);
  }, [sourceCanvas, displayWidth, displayHeight]);

  useEffect(() => {
    if (dragState === null) return;
    const handleMove = (event: PointerEvent): void => {
      const point = toNaturalPoint(event, containerRef.current, scale);
      if (point === null) return;
      applyDrag(dragState, point, naturalWidth, naturalHeight, frames, {
        onFramesChange,
        onPreview: setDragState,
      });
    };
    const handleUp = (): void => {
      if (dragState.type === "create") {
        finalizeCreate(dragState, onFramesChange, frames);
      }
      setDragState(null);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    // frames/onFramesChangeは最新のクロージャを使うため意図的に依存配列へ含める
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragState, scale, naturalWidth, naturalHeight]);

  const beginMove = (frame: StampFrame, event: ReactPointerEvent): void => {
    if (disabled) return;
    event.stopPropagation();
    const point = toNaturalPoint(
      event.nativeEvent,
      containerRef.current,
      scale,
    );
    if (point === null) return;
    setDragState({
      type: "move",
      frameId: frame.id,
      start: point,
      startFrame: frame,
    });
  };

  const beginResize = (
    frame: StampFrame,
    corner: ResizeCorner,
    event: ReactPointerEvent,
  ): void => {
    if (disabled) return;
    event.stopPropagation();
    const point = toNaturalPoint(
      event.nativeEvent,
      containerRef.current,
      scale,
    );
    if (point === null) return;
    setDragState({
      type: "resize",
      frameId: frame.id,
      corner,
      start: point,
      startFrame: frame,
    });
  };

  const beginCreate = (event: ReactPointerEvent): void => {
    if (disabled) return;
    const point = toNaturalPoint(
      event.nativeEvent,
      containerRef.current,
      scale,
    );
    if (point === null) return;
    setDragState({ type: "create", start: point, current: point });
  };

  const createPreview =
    dragState?.type === "create"
      ? normalizeRect(dragState.start, dragState.current)
      : null;

  return (
    <div
      ref={containerRef}
      onPointerDown={beginCreate}
      style={{
        width: displayWidth,
        height: displayHeight,
        touchAction: "none",
      }}
      className="relative select-none overflow-hidden rounded-lg border border-slate-300 bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px]"
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0"
      />
      {frames.map((frame, index) => (
        <div
          key={frame.id}
          onPointerDown={(event) => beginMove(frame, event)}
          style={{
            left: frame.x * scale,
            top: frame.y * scale,
            width: frame.width * scale,
            height: frame.height * scale,
            touchAction: "none",
          }}
          className={`absolute cursor-move border-2 ${
            selectedFrameIds.has(frame.id)
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-sky-500 bg-sky-500/10"
          }`}
        >
          <span className="absolute -top-2 -left-2 flex size-6 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
            {String(index + 1).padStart(2, "0")}
          </span>
          <input
            type="checkbox"
            aria-label={`${index + 1}番を結合対象として選択`}
            checked={selectedFrameIds.has(frame.id)}
            onPointerDown={(event) => event.stopPropagation()}
            onChange={() => onToggleSelect(frame.id)}
            className="absolute top-1 right-7 size-4"
          />
          <button
            type="button"
            aria-label={`${index + 1}番を削除`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() =>
              onFramesChange(
                frames.filter((candidate) => candidate.id !== frame.id),
              )
            }
            className="absolute top-0.5 right-0.5 flex size-5 items-center justify-center rounded-full bg-red-600 text-xs leading-none text-white hover:bg-red-700"
          >
            ×
          </button>
          {(["nw", "ne", "sw", "se"] as const).map((corner) => (
            <div
              key={corner}
              onPointerDown={(event) => beginResize(frame, corner, event)}
              style={cornerHandlePosition(corner)}
              className={`absolute size-3 rounded-full border border-white bg-sky-600 ${resizeCursor(corner)}`}
            />
          ))}
        </div>
      ))}
      {createPreview !== null && (
        <div
          style={{
            left: createPreview.x * scale,
            top: createPreview.y * scale,
            width: createPreview.width * scale,
            height: createPreview.height * scale,
          }}
          className="pointer-events-none absolute border-2 border-dashed border-emerald-600 bg-emerald-500/10"
        />
      )}
    </div>
  );
}

function toNaturalPoint(
  event: PointerEvent | MouseEvent,
  container: HTMLDivElement | null,
  scale: number,
): Point | null {
  if (container === null) return null;
  const rect = container.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / scale,
    y: (event.clientY - rect.top) / scale,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeRect(
  a: Point,
  b: Point,
): { x: number; y: number; width: number; height: number } {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

function computeResizedFrame(
  startFrame: StampFrame,
  corner: ResizeCorner,
  pointer: Point,
  naturalWidth: number,
  naturalHeight: number,
): StampFrame {
  const left = startFrame.x;
  const top = startFrame.y;
  const right = startFrame.x + startFrame.width;
  const bottom = startFrame.y + startFrame.height;

  const newLeft =
    corner === "ne" || corner === "se"
      ? left
      : clamp(pointer.x, 0, right - MIN_FRAME_SIZE);
  const newRight =
    corner === "nw" || corner === "sw"
      ? right
      : clamp(pointer.x, left + MIN_FRAME_SIZE, naturalWidth);
  const newTop =
    corner === "sw" || corner === "se"
      ? top
      : clamp(pointer.y, 0, bottom - MIN_FRAME_SIZE);
  const newBottom =
    corner === "nw" || corner === "ne"
      ? bottom
      : clamp(pointer.y, top + MIN_FRAME_SIZE, naturalHeight);

  return {
    id: startFrame.id,
    x: newLeft,
    y: newTop,
    width: newRight - newLeft,
    height: newBottom - newTop,
  };
}

function applyDrag(
  dragState: DragState,
  point: Point,
  naturalWidth: number,
  naturalHeight: number,
  frames: readonly StampFrame[],
  callbacks: {
    onFramesChange: (frames: StampFrame[]) => void;
    onPreview: (next: DragState) => void;
  },
): void {
  if (dragState.type === "move") {
    const dx = point.x - dragState.start.x;
    const dy = point.y - dragState.start.y;
    const { startFrame } = dragState;
    const nextFrame: StampFrame = {
      id: startFrame.id,
      x: clamp(startFrame.x + dx, 0, naturalWidth - startFrame.width),
      y: clamp(startFrame.y + dy, 0, naturalHeight - startFrame.height),
      width: startFrame.width,
      height: startFrame.height,
    };
    callbacks.onFramesChange(
      frames.map((frame) => (frame.id === nextFrame.id ? nextFrame : frame)),
    );
    return;
  }
  if (dragState.type === "resize") {
    const nextFrame = computeResizedFrame(
      dragState.startFrame,
      dragState.corner,
      point,
      naturalWidth,
      naturalHeight,
    );
    callbacks.onFramesChange(
      frames.map((frame) => (frame.id === nextFrame.id ? nextFrame : frame)),
    );
    return;
  }
  callbacks.onPreview({ ...dragState, current: point });
}

function finalizeCreate(
  dragState: Extract<DragState, { type: "create" }>,
  onFramesChange: (frames: StampFrame[]) => void,
  frames: readonly StampFrame[],
): void {
  const rect = normalizeRect(dragState.start, dragState.current);
  if (rect.width < MIN_FRAME_SIZE || rect.height < MIN_FRAME_SIZE) return;
  onFramesChange([...frames, { id: createStampFrameId(), ...rect }]);
}

function cornerHandlePosition(corner: ResizeCorner): {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  transform: string;
} {
  const isTop = corner === "nw" || corner === "ne";
  const isLeft = corner === "nw" || corner === "sw";
  return {
    ...(isTop ? { top: 0 } : { bottom: 0 }),
    ...(isLeft ? { left: 0 } : { right: 0 }),
    transform: `translate(${isLeft ? "-50%" : "50%"}, ${isTop ? "-50%" : "50%"})`,
  };
}

function resizeCursor(corner: ResizeCorner): string {
  return corner === "nw" || corner === "se"
    ? "cursor-nwse-resize"
    : "cursor-nesw-resize";
}
