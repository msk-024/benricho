/**
 * Blob をファイルとしてダウンロードさせる(DOM 副作用)。
 *
 * @precondition fileName は空でない文字列
 * @postcondition ブラウザのダウンロードが開始される
 */
const MIN_REVOKE_DELAY_MS = 10_000;
const MAX_REVOKE_DELAY_MS = 120_000;
/** revoke 猶予の目安(1MBあたりの追加待ち時間) */
const REVOKE_DELAY_MS_PER_MB = 1_000;

export function downloadBlob(blob: Blob, fileName: string): void {
  if (fileName === "") throw new RangeError("ファイル名が空です");
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  // ダウンロード開始前に revoke されるのを避けるため解放を遅らせる。
  // 巨大なファイル・低速回線ほどブラウザがBlobを読み終えるまで時間がかかるため、
  // サイズに応じて待ち時間を延ばす
  const sizeInMb = blob.size / 1024 / 1024;
  const revokeDelayMs = Math.min(
    MAX_REVOKE_DELAY_MS,
    MIN_REVOKE_DELAY_MS + Math.round(sizeInMb) * REVOKE_DELAY_MS_PER_MB,
  );
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), revokeDelayMs);
}

/** バイト列を指定 MIME タイプの Blob に変換する(バッファ所有権を明確にするためコピーする) */
export function bytesToBlob(bytes: Uint8Array, mimeType: string): Blob {
  const copy = new Uint8Array(bytes);
  return new Blob([copy.buffer], { type: mimeType });
}
