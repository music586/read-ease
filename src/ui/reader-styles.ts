import type { ReaderSettings } from "../domain/settings";

const THEMES = {
  light: {
    background: "#efefed",
    surface: "#fbfbfa",
    foreground: "#252422",
    muted: "#716d67",
    panel: "#ffffff",
  },
  sepia: {
    background: "#e7e0d3",
    surface: "#f4efe4",
    foreground: "#342f29",
    muted: "#7b7268",
    panel: "#fffdf8",
  },
  gray: {
    background: "#292a2b",
    surface: "#4b4b4d",
    foreground: "#dedede",
    muted: "#c5c5c7",
    panel: "#565658",
  },
  dark: {
    background: "#111213",
    surface: "#171819",
    foreground: "#dedbd5",
    muted: "#99958e",
    panel: "#242526",
  },
} as const;

export function settingsVariables(settings: ReaderSettings): string {
  const theme = THEMES[settings.theme];
  return [
    `--re-background:${theme.background}`,
    `--re-surface:${theme.surface}`,
    `--re-foreground:${theme.foreground}`,
    `--re-muted:${theme.muted}`,
    `--re-panel:${theme.panel}`,
    `--re-font-family:${settings.fontFamily}`,
    `--re-font-size:${settings.fontSize}px`,
    `--re-letter-spacing:${settings.letterSpacing}em`,
    `--re-line-height:${settings.lineHeight}`,
    `--re-paragraph-spacing:${settings.paragraphSpacing}em`,
    `--re-content-width:${settings.contentWidth}px`,
    `--re-page-margin:${settings.pageMargin}px`,
    `--re-panel-padding:${settings.pageMargin}px`,
  ].join(";");
}

export const READER_CSS = `
  :host { all: initial; color-scheme: light dark; }
  *, *::before, *::after { box-sizing: border-box; }
  .overlay {
    position: fixed; inset: 0; z-index: 2147483647; overflow: auto;
    background: var(--re-background); color: var(--re-foreground);
    font-family: var(--re-font-family); font-size: var(--re-font-size);
    letter-spacing: var(--re-letter-spacing); line-height: var(--re-line-height);
    --re-outer-gap: clamp(20px, 3vw, 44px);
    padding: var(--re-outer-gap) 0;
  }
  .article {
    width: min(
      calc(var(--re-content-width) + 2 * var(--re-panel-padding)),
      calc(100% - 2 * var(--re-page-margin))
    );
    min-height: calc(100vh - 2 * var(--re-outer-gap)); margin: 0 auto;
    padding: 72px var(--re-panel-padding) 120px;
    background: var(--re-surface);
    box-shadow: 0 0 34px #0002;
    border-radius: 3px;
  }
  .source { color: var(--re-muted); font: 600 12px/1.4 ui-sans-serif, system-ui; letter-spacing: .08em; text-transform: uppercase; }
  h1.title { margin: 12px 0 14px; font-size: clamp(2rem, 5vw, 3.4rem); line-height: 1.14; letter-spacing: -.035em; }
  .meta { color: var(--re-muted); font: 14px/1.5 ui-sans-serif, system-ui; margin-bottom: 42px; }
  .content p { margin: 0 0 var(--re-paragraph-spacing); }
  .content h2, .content h3, .content h4 { margin: 2em 0 .75em; line-height: 1.3; }
  .content img { display: block; max-width: 100%; height: auto; margin: 2em auto; border-radius: 10px; }
  .content figure { margin: 2em 0; }
  .content figcaption { color: var(--re-muted); font-size: .78em; text-align: center; }
  .content a { color: inherit; text-decoration-color: var(--re-muted); text-underline-offset: .18em; }
  .content blockquote { margin: 1.6em 0; padding: .2em 0 .2em 1.2em; border-left: 3px solid var(--re-muted); color: var(--re-muted); }
  .content pre { overflow: auto; padding: 1em; border-radius: 10px; background: color-mix(in srgb, var(--re-foreground) 8%, transparent); }
  .content code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .86em; }
  .content table { width: 100%; border-collapse: collapse; overflow: auto; display: block; margin: 1.5em 0; }
  .content th, .content td { border: 1px solid color-mix(in srgb, var(--re-foreground) 18%, transparent); padding: .55em .7em; }
  .pill { position: fixed; top: 18px; right: 20px; z-index: 2; display: flex; align-items: center; background: var(--re-panel); border: 1px solid color-mix(in srgb, var(--re-foreground) 12%, transparent); border-radius: 999px; box-shadow: 0 8px 28px #0002; overflow: hidden; }
  button { appearance: none; border: 0; background: transparent; color: var(--re-foreground); cursor: pointer; font: 600 14px/1 ui-sans-serif, system-ui; }
  .pill button { width: 42px; height: 36px; }
  .pill button:hover { background: color-mix(in srgb, var(--re-foreground) 8%, transparent); }
  .popover { position: fixed; top: 62px; right: 20px; z-index: 3; width: 282px; padding: 18px; border: 1px solid color-mix(in srgb, var(--re-foreground) 12%, transparent); border-radius: 16px; background: var(--re-panel); box-shadow: 0 18px 48px #0004; font: 13px/1.35 ui-sans-serif, system-ui; }
  .popover[hidden] { display: none; }
  .popover h2 { margin: 0 0 14px; font-size: 14px; }
  .themes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 15px; }
  .theme { height: 34px; border-radius: 9px; border: 2px solid transparent; }
  .theme[aria-pressed=true] { border-color: #6d7c61; }
  .field { display: grid; grid-template-columns: 58px 1fr 38px; align-items: center; gap: 8px; margin: 10px 0; color: var(--re-muted); }
  .field select, .field input[type=range] { width: 100%; accent-color: #6d7c61; }
  .field output { text-align: right; color: var(--re-foreground); }
  .font-field { grid-template-columns: 58px 1fr; }
  .width-presets { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: -2px 0 12px 66px; }
  .width-presets button { display: grid; gap: 3px; padding: 7px 3px; border: 1px solid color-mix(in srgb, var(--re-foreground) 14%, transparent); border-radius: 7px; color: var(--re-muted); }
  .width-presets button:hover { background: color-mix(in srgb, var(--re-foreground) 7%, transparent); }
  .width-presets button[aria-pressed=true] { color: var(--re-foreground); border-color: #6d7c61; background: color-mix(in srgb, #6d7c61 14%, transparent); }
  .width-presets small { font-size: 10px; font-weight: 500; opacity: .78; }
  select { min-width: 0; padding: 7px; border: 1px solid color-mix(in srgb, var(--re-foreground) 14%, transparent); border-radius: 8px; background: var(--re-background); color: var(--re-foreground); }
  .popover-footer { border-top: 1px solid color-mix(in srgb, var(--re-foreground) 12%, transparent); margin-top: 14px; padding-top: 12px; display: grid; gap: 10px; }
  .checkbox { display: flex; align-items: center; gap: 8px; color: var(--re-muted); cursor: pointer; }
  .link-button { text-align: left; padding: 4px 0; color: var(--re-muted); }
  .link-button:hover { color: var(--re-foreground); }
  @media (max-width: 640px) {
    .overlay { --re-outer-gap: 10px; }
    .article {
      width: calc(100% - 16px);
      min-height: calc(100vh - 2 * var(--re-outer-gap));
      padding: 82px max(20px, var(--re-page-margin)) 90px;
      border-radius: 2px;
    }
    .popover { left: 16px; right: 16px; width: auto; }
  }
`;
