import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isThemePreference, resolveTheme, THEME_STORAGE_KEY } from "./theme";

describe("isThemePreference", () => {
  it("system/light/darkをThemePreferenceとして認める", () => {
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
  });

  it("不正な値・null・文字列以外をThemePreferenceと認めない", () => {
    expect(isThemePreference("auto")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference(undefined)).toBe(false);
    expect(isThemePreference(1)).toBe(false);
  });
});

describe("resolveTheme", () => {
  it("light/darkは常にそのまま解決される(OS設定を無視する)", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("systemはsystemPrefersDarkに従って解決される", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("index.htmlのFOUC防止スクリプトとの整合", () => {
  it("THEME_STORAGE_KEYの値がindex.htmlにも同じ文字列で埋め込まれている", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const indexHtmlPath = resolve(here, "../../index.html");
    const html = readFileSync(indexHtmlPath, "utf-8");
    expect(html).toContain(`"${THEME_STORAGE_KEY}"`);
  });
});
