/**
 * Blob をファイルとしてダウンロードさせる(DOM 副作用)。
 *
 * @precondition fileName は空でない文字列
 * @postcondition ブラウザのダウンロードが開始される
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  if (fileName === "") throw new RangeError("ファイル名が空です");
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  // ダウンロード開始前に revoke されるのを避けるため解放を遅らせる
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}

/** バイト列を指定 MIME タイプの Blob に変換する(バッファ所有権を明確にするためコピーする) */
export function bytesToBlob(bytes: Uint8Array, mimeType: string): Blob {
  const copy = new Uint8Array(bytes);
  return new Blob([copy.buffer], { type: mimeType });
}
