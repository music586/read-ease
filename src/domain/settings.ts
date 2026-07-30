export type ReaderTheme = "light" | "sepia" | "dark";

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

export const DEFAULT_SETTINGS: ReaderSettings = {
  theme: "sepia",
  fontFamily:
    'ui-serif, "Source Han Serif SC", "Noto Serif CJK SC", Georgia, serif',
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
  return { ...DEFAULT_SETTINGS, ...global, ...site };
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

