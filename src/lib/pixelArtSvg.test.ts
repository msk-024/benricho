import { describe, expect, it } from "vitest";
import type { RgbaImage } from "./imageOps";
import { pixelArtToSvg } from "./pixelArtSvg";

function makeImage(
  width: number,
  height: number,
  rgba: readonly [number, number, number, number],
): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set(rgba, i * 4);
  return { width, height, data };
}

function setPixel(
  image: RgbaImage,
  x: number,
  y: number,
  rgba: readonly [number, number, number, number],
): void {
  image.data.set(rgba, (y * image.width + x) * 4);
}

function countOccurrences(text: string, pattern: string): number {
  return text.split(pattern).length - 1;
}

describe("pixelArtToSvg", () => {
  it("単色の画像は縦横とも結合され1つのrectになる", () => {
    const image = makeImage(4, 3, [255, 0, 0, 255]);
    const svg = pixelArtToSvg(image);
    expect(svg).toContain('viewBox="0 0 4 3"');
    expect(svg).toContain('width="4" height="3"');
    expect(countOccurrences(svg, "<rect")).toBe(1);
    expect(svg).toContain(
      '<rect x="0" y="0" width="4" height="3" fill="#ff0000"/>',
    );
  });

  it("全透明の画像はrectを1つも出力しない", () => {
    const image = makeImage(3, 3, [0, 0, 0, 0]);
    const svg = pixelArtToSvg(image);
    expect(countOccurrences(svg, "<rect")).toBe(0);
  });

  it("横方向に連続する同色はまとめ、別の色で区切られる", () => {
    const image = makeImage(3, 1, [0, 0, 0, 255]);
    setPixel(image, 0, 0, [255, 0, 0, 255]);
    setPixel(image, 1, 0, [255, 0, 0, 255]);
    setPixel(image, 2, 0, [0, 255, 0, 255]);
    const svg = pixelArtToSvg(image);
    expect(countOccurrences(svg, "<rect")).toBe(2);
    expect(svg).toContain(
      '<rect x="0" y="0" width="2" height="1" fill="#ff0000"/>',
    );
    expect(svg).toContain(
      '<rect x="2" y="0" width="1" height="1" fill="#00ff00"/>',
    );
  });

  it("途中の行で色が変わると縦方向の結合はそこで分断される", () => {
    const image = makeImage(1, 3, [255, 0, 0, 255]);
    setPixel(image, 0, 1, [0, 0, 255, 255]);
    const svg = pixelArtToSvg(image);
    expect(countOccurrences(svg, "<rect")).toBe(3);
    expect(svg).toContain(
      '<rect x="0" y="0" width="1" height="1" fill="#ff0000"/>',
    );
    expect(svg).toContain(
      '<rect x="0" y="1" width="1" height="1" fill="#0000ff"/>',
    );
    expect(svg).toContain(
      '<rect x="0" y="2" width="1" height="1" fill="#ff0000"/>',
    );
  });

  it("半透明の画素はfill-opacityを付与する", () => {
    const image = makeImage(1, 1, [0, 0, 0, 128]);
    const svg = pixelArtToSvg(image);
    expect(svg).toContain('fill-opacity="0.502"');
  });

  it("不透明(alpha=255)の画素はfill-opacityを付与しない", () => {
    const image = makeImage(1, 1, [0, 0, 0, 255]);
    const svg = pixelArtToSvg(image);
    expect(svg).not.toContain("fill-opacity");
  });

  it("事前条件違反でRangeErrorを投げる", () => {
    expect(() =>
      pixelArtToSvg({ width: 2, height: 2, data: new Uint8ClampedArray(3) }),
    ).toThrow(RangeError);
  });
});
