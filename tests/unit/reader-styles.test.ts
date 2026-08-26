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

  it("animates the overlay and paper while respecting reduced motion", () => {
    expect(READER_CSS).toContain("transition: background-color 220ms");
    expect(READER_CSS).toContain("translateY(16px) scale(.985)");
    expect(READER_CSS).toContain("transform 280ms cubic-bezier(.22, 1, .36, 1) 25ms");
    expect(READER_CSS).toContain("transform 190ms ease-out 90ms");
    expect(READER_CSS).toContain('[data-transition-state="exiting"]');
    expect(READER_CSS).toContain('[data-transition-state="visible"]');
    expect(READER_CSS).toContain("prefers-reduced-motion: reduce");
  });

  it("centers the image preview title while reserving room for controls", () => {
    expect(READER_CSS).toMatch(
      /\.image-preview-title \{[\s\S]*?left: 50%;[\s\S]*?transform: translateX\(-50%\);/,
    );
    expect(READER_CSS).toContain("max-width: calc(100vw - 144px)");
  });

  it("uses a soft focus treatment for the preview close icon", () => {
    expect(READER_CSS).toContain("width: 16px; height: 16px");
    expect(READER_CSS).toMatch(
      /\.image-preview-close:focus-visible \{[\s\S]*?outline: none;[\s\S]*?transform: scale\(1\.06\);/,
    );
    expect(READER_CSS).toMatch(
      /\.image-preview-close:focus-visible::before \{[\s\S]*?opacity: \.14;/,
    );
    expect(READER_CSS).toContain("@media (forced-colors: active)");
  });
});
