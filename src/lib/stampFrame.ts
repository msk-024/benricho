export interface StampFrame {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

let frameIdCounter = 0;

/** 手動追加・結合で使う一意なフレームIDを発行する */
export function createStampFrameId(): string {
  frameIdCounter += 1;
  return `frame-${frameIdCounter}`;
}
