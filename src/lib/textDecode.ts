/**
 * テキストファイルのバイト列を UTF-8 として復号し、文字化けの兆候(U+FFFD)が
 * あれば Shift_JIS として再解釈するフォールバック判定。
 *
 * 既知の限界: 完全な文字コード自動判定ではないヒューリスティックのため、
 * 偶然 UTF-8 として妥当な Shift_JIS バイト列や、正当な UTF-8 中に実際の
 * '�'(U+FFFD)文字が含まれる場合は誤判定しうる。
 *
 * @postcondition Shift_JIS への復号に失敗した場合は UTF-8 の結果を返す
 */
export function decodeTextWithEncodingFallback(bytes: BufferSource): string {
  const utf8Text = new TextDecoder("utf-8").decode(bytes);
  if (!utf8Text.includes("�")) return utf8Text;
  try {
    return new TextDecoder("shift_jis").decode(bytes);
  } catch {
    return utf8Text;
  }
}
