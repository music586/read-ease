import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, type ReaderTheme } from "../../src/domain/settings";
import { READER_CSS, settingsVariables } from "../../src/ui/reader-styles";

describe("reader theme colors", () => {
  const palettes: Record<ReaderTheme, string[]> = {
    light: ["#d9d9d7", "#ffffff", "#171717", "#66635f"],
    sepia: ["#cfc2ab", "#fff3dc", "#241c15", "#756453"],
    gray: ["#202124", "#494a4d", "#f5f5f3", "#c2c3c5"],
    dark: ["#050607", "#171819", "#f5f3ee", "#aaa7a0"],
  };

  it.each(Object.entries(palettes))(
    "applies the %s background, paper, text, and muted colors",
    (theme, colors) => {
      const variables = settingsVariables({
        ...DEFAULT_SETTINGS,
        theme: theme as ReaderTheme,
      }).toLowerCase();
      expect(variables).toContain(`--re-background:${colors[0]}`);
      expect(variables).toContain(`--re-surface:${colors[1]}`);
      expect(variables).toContain(`--re-foreground:${colors[2]}`);
      expect(variables).toContain(`--re-muted:${colors[3]}`);
      expect(variables).toContain("--re-paper-shadow:");
      expect(variables).toContain("--re-paper-border:");
    },
  );

  it("uses theme-specific paper depth variables", () => {
    expect(READER_CSS).toContain("box-shadow: var(--re-paper-shadow)");
    expect(READER_CSS).toContain("border: 1px solid var(--re-paper-border)");
  });

  it("uses character-level justification with a natural final line", () => {
    expect(READER_CSS).toContain("text-justify: auto");
    expect(READER_CSS).toContain("text-align-last: start");
    expect(READER_CSS).toContain("line-break: strict");
    expect(READER_CSS).toContain("text-autospace: no-autospace");
    expect(READER_CSS).not.toContain(".re-justify-glyph");
    expect(READER_CSS).not.toContain("text-justify: inter-ideograph");
    expect(READER_CSS).not.toContain("--re-word-break");
  });
});
