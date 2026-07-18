import { useEffect, useState } from "react";

/**
 * Blob からプレビュー用オブジェクト URL を生成し、不要になったら自動で解放する。
 *
 * @postcondition 返した URL はコンポーネント破棄時・Blob 差し替え時に revoke される
 */
export function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (blob === null) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  return url;
}
