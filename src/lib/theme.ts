export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "benricho-theme";

const THEME_PREFERENCES: readonly ThemePreference[] = [
  "system",
  "light",
  "dark",
];

/**
 * localStorage等から読み取った任意の値が ThemePreference として妥当か判定する。
 *
 * @postcondition true を返した場合、value は ThemePreference として安全に扱える
 */
export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === "string" &&
    (THEME_PREFERENCES as readonly string[]).includes(value)
  );
}

/**
 * ThemePreference(自動/ライト/ダーク)を、実際に適用すべき明暗(light/dark)へ解決する。
 * 「自動」の判定にOSの設定(prefers-color-scheme)をそのまま使うかはここでは決めず、
 * 呼び出し側が matchMedia の結果等を systemPrefersDark として渡す(副作用分離のため)。
 *
 * @precondition なし(preference/systemPrefersDark とも任意の値を受け付ける)
 * @postcondition 戻り値は必ず "light" か "dark" のいずれか
 */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return systemPrefersDark ? "dark" : "light";
}
