import { type RgbaImage, assertValidImage } from "./imageOps";
import type { RgbColor } from "./pixelArt";

interface RowRun {
  x: number;
  width: number;
  color: RgbColor;
  alpha: number;
}

interface OpenRect extends RowRun {
  yStart: number;
}

interface ClosedRect extends OpenRect {
  height: number;
}

/**
 * ドット絵のグリッド画像をSVGマークアップ(文字列)に変換する。
 * 1マス=1単位のベクターで出力するため、PNGと違い拡大しても劣化しない。
 * 同色が連続するマスは横方向→縦方向の順にまとめて1つのrectにし、
 * 透明なマスはrectを出力しない(要素数とファイルサイズを抑える)。
 *
 * @precondition image は正当なRGBA画像
 * @postcondition 戻り値は viewBox が `0 0 image.width image.height` の有効なSVG文字列
 * @throws {RangeError} 事前条件に違反した場合
 */
export function pixelArtToSvg(image: RgbaImage): string {
  assertValidImage(image);

  const closedRects: ClosedRect[] = [];
  let openRects: OpenRect[] = [];

  for (let y = 0; y < image.height; y++) {
    const rowRuns = computeRowRuns(image, y);
    const stillOpen: OpenRect[] = [];
    for (const open of openRects) {
      const matchIndex = rowRuns.findIndex((run) => sameRun(run, open));
      if (matchIndex === -1) {
        closedRects.push({ ...open, height: y - open.yStart });
        continue;
      }
      stillOpen.push(open);
      rowRuns.splice(matchIndex, 1);
    }
    for (const run of rowRuns) {
      stillOpen.push({ ...run, yStart: y });
    }
    openRects = stillOpen;
  }
  for (const open of openRects) {
    closedRects.push({ ...open, height: image.height - open.yStart });
  }

  const rectMarkup = closedRects.map(rectToSvgElement).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${image.width} ${image.height}" ` +
    `width="${image.width}" height="${image.height}" shape-rendering="crispEdges">` +
    `${rectMarkup}</svg>`
  );
}

function sameRun(a: RowRun, b: RowRun): boolean {
  return (
    a.x === b.x &&
    a.width === b.width &&
    a.alpha === b.alpha &&
    a.color.r === b.color.r &&
    a.color.g === b.color.g &&
    a.color.b === b.color.b
  );
}

/** 1行分の横方向ランレングス(同色が連続する区間)を求める。透明なマスは含めない */
function computeRowRuns(image: RgbaImage, y: number): RowRun[] {
  const runs: RowRun[] = [];
  let x = 0;
  while (x < image.width) {
    const i = (y * image.width + x) * 4;
    const alpha = image.data[i + 3];
    if (alpha === 0) {
      x++;
      continue;
    }
    const color: RgbColor = {
      r: image.data[i],
      g: image.data[i + 1],
      b: image.data[i + 2],
    };
    let end = x + 1;
    while (end < image.width) {
      const j = (y * image.width + end) * 4;
      if (
        image.data[j + 3] !== alpha ||
        image.data[j] !== color.r ||
        image.data[j + 1] !== color.g ||
        image.data[j + 2] !== color.b
      ) {
        break;
      }
      end++;
    }
    runs.push({ x, width: end - x, color, alpha });
    x = end;
  }
  return runs;
}

function rectToSvgElement(rect: ClosedRect): string {
  const fill = `#${toHex2(rect.color.r)}${toHex2(rect.color.g)}${toHex2(rect.color.b)}`;
  const opacityAttr =
    rect.alpha < 255 ? ` fill-opacity="${(rect.alpha / 255).toFixed(3)}"` : "";
  return `<rect x="${rect.x}" y="${rect.yStart}" width="${rect.width}" height="${rect.height}" fill="${fill}"${opacityAttr}/>`;
}

function toHex2(value: number): string {
  return value.toString(16).padStart(2, "0");
}
