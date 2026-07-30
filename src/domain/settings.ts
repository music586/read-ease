export type ReaderTheme = "light" | "sepia" | "gray" | "dark";

export interface ReaderSettings {
  theme: ReaderTheme;
  fontFamily: string;
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
  paragraphSpacing: number;
  contentWidth: number;
  pageMargin: number;
}

export type SiteSettingsOverride = Partial<ReaderSettings>;

export const SYSTEM_SERIF_FONT = "serif";
export const SYSTEM_SANS_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
export const CHINESE_SONG_FONT =
  '"Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", SimSun, serif';
export const PAGE_DEFAULT_FONT =
  "var(--re-page-font-family, ui-sans-serif, system-ui, sans-serif)";

export const DEFAULT_SETTINGS: ReaderSettings = {
  theme: "sepia",
  fontFamily: SYSTEM_SERIF_FONT,
  fontSize: 19,
  letterSpacing: 0.01,
  lineHeight: 1.85,
  paragraphSpacing: 1.15,
  contentWidth: 720,
  pageMargin: 32,
};

export function resolveSettings(
  global: Partial<ReaderSettings> = {},
  site: SiteSettingsOverride = {},
): ReaderSettings {
  const resolved = { ...DEFAULT_SETTINGS, ...global, ...site };
  const supportedFonts = new Set([
    SYSTEM_SERIF_FONT,
    SYSTEM_SANS_FONT,
    CHINESE_SONG_FONT,
    PAGE_DEFAULT_FONT,
  ]);
  if (!supportedFonts.has(resolved.fontFamily)) {
    resolved.fontFamily = resolved.fontFamily.includes("sans")
      ? PAGE_DEFAULT_FONT
      : SYSTEM_SERIF_FONT;
  }
  return resolved;
}

export function changedSettings(
  base: ReaderSettings,
  next: ReaderSettings,
): SiteSettingsOverride {
  return Object.fromEntries(
    Object.entries(next).filter(
      ([key, value]) => base[key as keyof ReaderSettings] !== value,
    ),
  ) as SiteSettingsOverride;
}
