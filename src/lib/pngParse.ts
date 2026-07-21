const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

export interface PngSize {
  width: number;
  height: number;
}

/**
 * バイト列が PNG シグネチャで始まるか判定する。
 *
 * @postcondition 真偽値を返すのみで副作用はない
 */
export function isPng(bytes: Uint8Array): boolean {
  if (bytes.length < PNG_SIGNATURE.length) return false;
  return PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

/**
 * PNG の IHDR チャンクから画像の実寸を読み取る。
 *
 * @precondition bytes は正当な PNG(シグネチャ + IHDR が先頭 24 バイト以上)
 * @postcondition 戻り値の width / height は 1 以上の整数
 * @throws {Error} PNG でない、またはデータが壊れている場合
 */
export function readPngSize(bytes: Uint8Array): PngSize {
  if (!isPng(bytes)) throw new Error("PNG形式ではありません");
  if (bytes.length < 24) throw new Error("PNGデータが不完全です");
  const chunkType = String.fromCharCode(
    bytes[12],
    bytes[13],
    bytes[14],
    bytes[15],
  );
  if (chunkType !== "IHDR")
    throw new Error("PNGの先頭チャンクがIHDRではありません");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width < 1 || height < 1) throw new Error("PNGの画像サイズが不正です");
  return { width, height };
}

/**
 * 出力 PNG が期待サイズと 1px の誤差もなく一致することを検証する(LINEスタンプ要件)。
 *
 * @precondition expectedWidth, expectedHeight は 1 以上の整数
 * @postcondition 一致する場合のみ正常終了する
 * @throws {Error} サイズ不一致、または PNG が不正な場合
 */
export function assertPngSize(
  bytes: Uint8Array,
  expectedWidth: number,
  expectedHeight: number,
): void {
  const { width, height } = readPngSize(bytes);
  if (width !== expectedWidth || height !== expectedHeight) {
    throw new Error(
      `出力サイズが不正です: 期待 ${expectedWidth}×${expectedHeight}px, 実際 ${width}×${height}px`,
    );
  }
}
