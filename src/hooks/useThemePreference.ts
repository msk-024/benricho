import { useCallback, useEffect, useState } from "react";
import {
  isThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "../lib/theme";

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function applyResolvedTheme(resolved: ResolvedTheme): void {
  if (resolved === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

/**
 * テーマ設定(自動/ライト/ダーク)の読み書きとDOMへの反映をまとめたフック。
 * 「自動」選択中はOSの prefers-color-scheme を購読し、OS側の設定が変わったら
 * リロードなしで追従する。初回描画前の反映は index.html のインラインスクリプトが
 * 担当するため、ここでの初期化は冪等(同じ値を再度適用しても表示は変わらない)。
 *
 * @postcondition 返す setter を呼ぶと DOM(data-theme属性)と localStorage の両方に反映される
 */
export function useThemePreference(): [
  ThemePreference,
  (next: ThemePreference) => void,
] {
  const [preference, setPreference] =
    useState<ThemePreference>(readStoredPreference);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyForCurrentPreference = (): void => {
      applyResolvedTheme(resolveTheme(preference, mediaQuery.matches));
    };

    applyForCurrentPreference();

    if (preference !== "system") return undefined;
    mediaQuery.addEventListener("change", applyForCurrentPreference);
    return () =>
      mediaQuery.removeEventListener("change", applyForCurrentPreference);
  }, [preference]);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // localStorageが使えない環境でも表示自体は継続する
    }
  }, [preference]);

  const updatePreference = useCallback((next: ThemePreference) => {
    setPreference(next);
  }, []);

  return [preference, updatePreference];
}
