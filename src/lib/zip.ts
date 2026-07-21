import { zipSync, type Zippable } from "fflate";

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/**
 * ファイル群を ZIP アーカイブにまとめる。
 * 画像・PDF 等の再圧縮効果が薄いデータを想定し、無圧縮(store)で格納する。
 *
 * @precondition entries は 1 件以上で、ファイル名に重複がない
 * @postcondition 戻り値は全エントリを含む正当な ZIP バイト列
 * @throws {RangeError} エントリが空、またはファイル名が重複している場合
 */
export function createZip(entries: readonly ZipEntry[]): Uint8Array {
  if (entries.length === 0)
    throw new RangeError("ZIPに含めるファイルがありません");
  const zippable: Zippable = {};
  for (const entry of entries) {
    if (entry.name in zippable) {
      throw new RangeError(`ZIP内のファイル名が重複しています: ${entry.name}`);
    }
    zippable[entry.name] = [entry.data, { level: 0 }];
  }
  return zipSync(zippable);
}
