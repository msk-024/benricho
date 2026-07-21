/**
 * 複数のバイト列を 1 つに連結する。
 *
 * @precondition parts の各要素は Uint8Array
 * @postcondition 戻り値の長さは各要素の長さの合計に一致する
 */
export function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
