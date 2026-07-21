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

/**
 * 同名(大文字小文字を無視)のファイル名にサフィックスを付けて一意にする。
 * ZIP格納時の名前衝突(createZipの重複エラー)や、Windowsでの大文字小文字を
 * 区別しない展開による上書きを防ぐ。
 *
 * @postcondition 戻り値は入力と同じ長さで、各要素は(大文字小文字を無視して)重複しない
 */
export function dedupeFileNames(fileNames: readonly string[]): string[] {
  const usedLower = new Set<string>();
  return fileNames.map((name) => {
    let candidate = name;
    let suffixIndex = 2;
    while (usedLower.has(candidate.toLowerCase())) {
      candidate = appendSuffix(name, `_${suffixIndex}`);
      suffixIndex++;
    }
    usedLower.add(candidate.toLowerCase());
    return candidate;
  });
}

/**
 * ファイル名とMIMEタイプが input[accept] 形式の許可リストに一致するか判定する。
 * ".ext" 拡張子指定・"type/subtype" 完全一致・"type/*" ワイルドカードに対応する。
 * ドラッグ&ドロップ経路では accept 属性がブラウザに強制されないため、
 * ドロップされたファイルをこの関数で明示的に絞り込む。
 */
export function matchesAccept(
  fileName: string,
  mimeType: string,
  accept: string,
): boolean {
  const patterns = accept
    .split(",")
    .map((pattern) => pattern.trim().toLowerCase())
    .filter((pattern) => pattern !== "");
  if (patterns.length === 0) return true;
  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType.toLowerCase();
  return patterns.some((pattern) => {
    if (pattern.startsWith(".")) return lowerName.endsWith(pattern);
    if (pattern.endsWith("/*"))
      return lowerMime.startsWith(pattern.slice(0, -1));
    return lowerMime === pattern;
  });
}

/** バイト数を人間が読みやすい単位で整形する */
export function formatBytes(byteCount: number): string {
  if (!Number.isFinite(byteCount) || byteCount < 0) return "-";
  if (byteCount < 1024) return `${byteCount} B`;
  const kb = byteCount / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}
