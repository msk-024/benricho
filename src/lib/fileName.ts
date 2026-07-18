/**
 * ファイル名の拡張子を置き換える。拡張子がない場合は末尾に付加する。
 *
 * @precondition newExtension はドットを含まない拡張子(例: "webp")
 * @postcondition 戻り値は `基底名.newExtension` 形式
 */
export function replaceExtension(
  fileName: string,
  newExtension: string,
): string {
  const dotIndex = fileName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  return `${baseName}.${newExtension}`;
}

/** ファイル名の拡張子を除いた基底名を返す */
export function baseName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
}

/** 基底名にサフィックスを挿入する(例: photo.jpg + "_noexif" → photo_noexif.jpg) */
export function appendSuffix(fileName: string, suffix: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) return `${fileName}${suffix}`;
  return `${fileName.slice(0, dotIndex)}${suffix}${fileName.slice(dotIndex)}`;
}

/** バイト数を人間が読みやすい単位で整形する */
export function formatBytes(byteCount: number): string {
  if (!Number.isFinite(byteCount) || byteCount < 0) return "-";
  if (byteCount < 1024) return `${byteCount} B`;
  const kb = byteCount / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}
