import { describe, expect, it } from "vitest";
import { computeFitRect } from "./fitRect";

describe("computeFitRect", () => {
  it("正方形の元画像はLINEスタンプ本体(370×320, 余白10px)で高さ側いっぱいにフィットする", () => {
    const rect = computeFitRect(500, 500, 370, 320, 10);
    expect(rect).toEqual({ x: 35, y: 10, width: 300, height: 300 });
  });

  it("横長画像は幅側いっぱいにフィットする", () => {
    const rect = computeFitRect(1000, 100, 370, 320, 10);
    expect(rect.width).toBe(350);
    expect(rect.height).toBe(35);
    expect(rect.x).toBe(10);
  });

  it("メイン画像(240×240)で幅・高さのどちらかが利用可能領域に厳密一致する(最大化保証)", () => {
    const testCases = [
      [640, 480],
      [480, 640],
      [333, 333],
      [1, 1000],
      [1920, 1080],
    ] as const;
    for (const [srcWidth, srcHeight] of testCases) {
      const rect = computeFitRect(srcWidth, srcHeight, 240, 240, 10);
      expect(Math.max(rect.width, rect.height)).toBe(220);
    }
  });

  it("矩形は常に余白を除いた利用可能領域内に収まる", () => {
    const testCases = [
      [370, 320, 10],
      [96, 74, 4],
      [240, 240, 0],
    ] as const;
    for (const [canvasWidth, canvasHeight, padding] of testCases) {
      for (const [srcWidth, srcHeight] of [
        [3000, 17],
        [17, 3000],
        [123, 456],
      ] as const) {
        const rect = computeFitRect(
          srcWidth,
          srcHeight,
          canvasWidth,
          canvasHeight,
          padding,
        );
        expect(rect.x).toBeGreaterThanOrEqual(padding);
        expect(rect.y).toBeGreaterThanOrEqual(padding);
        expect(rect.x + rect.width).toBeLessThanOrEqual(canvasWidth - padding);
        expect(rect.y + rect.height).toBeLessThanOrEqual(
          canvasHeight - padding,
        );
        expect(rect.width).toBeGreaterThanOrEqual(1);
        expect(rect.height).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("タブ画像(96×74)でも縦横比を保ちながら収まる", () => {
    const rect = computeFitRect(370, 320, 96, 74, 4);
    expect(rect.x + rect.width).toBeLessThanOrEqual(92);
    expect(rect.y + rect.height).toBeLessThanOrEqual(70);
    expect(rect.height).toBe(66);
  });

  it("事前条件違反で RangeError を投げる", () => {
    expect(() => computeFitRect(0, 100, 370, 320, 10)).toThrow(RangeError);
    expect(() => computeFitRect(100, -1, 370, 320, 10)).toThrow(RangeError);
    expect(() => computeFitRect(100, 100, 370, 320, -1)).toThrow(RangeError);
    expect(() => computeFitRect(100, 100, 370, 320, 1.5)).toThrow(RangeError);
    expect(() => computeFitRect(100, 100, 20, 320, 10)).toThrow(RangeError);
  });
});
