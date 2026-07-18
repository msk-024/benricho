export interface IcoEntryInput {
  width: number;
  height: number;
  pngBytes: Uint8Array;
}

const ICO_HEADER_SIZE = 6;
const ICO_ENTRY_SIZE = 16;

/**
 * PNG 埋め込み形式の ICO ファイルを生成する(Windows Vista 以降・全モダンブラウザ対応)。
 *
 * @precondition entries は 1〜32 件
 * @precondition 各エントリの width / height は 1〜256 の整数で、pngBytes は空でない
 * @postcondition 戻り値は ICONDIR + ICONDIRENTRY 群 + PNG データ群の正当な ICO バイト列
 * @throws {RangeError} 事前条件に違反した場合
 */
export function encodeIco(entries: readonly IcoEntryInput[]): Uint8Array {
  if (entries.length < 1 || entries.length > 32) {
    throw new RangeError(`エントリ数は 1〜32 が必要です: ${entries.length}`);
  }
  for (const entry of entries) {
    if (
      !isValidIcoDimension(entry.width) ||
      !isValidIcoDimension(entry.height)
    ) {
      throw new RangeError(
        `ICOのサイズは 1〜256 の整数が必要です: ${entry.width}×${entry.height}`,
      );
    }
    if (entry.pngBytes.length === 0) throw new RangeError("PNGデータが空です");
  }

  const directorySize = ICO_HEADER_SIZE + ICO_ENTRY_SIZE * entries.length;
  const totalSize =
    directorySize +
    entries.reduce((sum, entry) => sum + entry.pngBytes.length, 0);
  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0, true); // 予約領域
  view.setUint16(2, 1, true); // 種別: アイコン
  view.setUint16(4, entries.length, true);

  let dataOffset = directorySize;
  entries.forEach((entry, index) => {
    const entryOffset = ICO_HEADER_SIZE + index * ICO_ENTRY_SIZE;
    out[entryOffset] = entry.width === 256 ? 0 : entry.width;
    out[entryOffset + 1] = entry.height === 256 ? 0 : entry.height;
    view.setUint16(entryOffset + 4, 1, true); // カラープレーン数
    view.setUint16(entryOffset + 6, 32, true); // ビット深度ヒント
    view.setUint32(entryOffset + 8, entry.pngBytes.length, true);
    view.setUint32(entryOffset + 12, dataOffset, true);
    out.set(entry.pngBytes, dataOffset);
    dataOffset += entry.pngBytes.length;
  });
  return out;
}

function isValidIcoDimension(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 256;
}
