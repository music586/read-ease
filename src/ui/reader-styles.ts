import type { ReaderSettings } from "../domain/settings";

const THEMES = {
  light: {
    background: "#d9d9d7",
    surface: "#ffffff",
    foreground: "#171717",
    muted: "#66635f",
    panel: "#ffffff",
    paperShadow: "0 10px 38px #0000002e, 0 1px 3px #0000001f",
    paperBorder: "#00000014",
  },
  sepia: {
    background: "#cfc2ab",
    surface: "#fff3dc",
    foreground: "#241c15",
    muted: "#756453",
    panel: "#fff8e8",
    paperShadow: "0 10px 38px #3b281f3d, 0 1px 3px #3b281f24",
    paperBorder: "#5a3e2424",
  },
  gray: {
    background: "#202124",
    surface: "#494a4d",
    foreground: "#f5f5f3",
    muted: "#c2c3c5",
    panel: "#55565a",
    paperShadow: "0 12px 42px #00000070, 0 1px 3px #00000066",
    paperBorder: "#ffffff14",
  },
  dark: {
    background: "#050607",
    surface: "#171819",
    foreground: "#f5f3ee",
    muted: "#aaa7a0",
    panel: "#212326",
    paperShadow: "0 12px 44px #000000b3, 0 1px 3px #00000099",
    paperBorder: "#ffffff12",
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
    `--re-paper-shadow:${theme.paperShadow}`,
    `--re-paper-border:${theme.paperBorder}`,
    `--re-font-family:${settings.fontFamily}`,
    `--re-font-size:${settings.fontSize}px`,
    `--re-letter-spacing:${settings.letterSpacing}em`,
    `--re-line-height:${settings.lineHeight}`,
    `--re-paragraph-spacing:${settings.paragraphSpacing}em`,
    `--re-content-width:${settings.contentWidth}px`,
    `--re-page-margin:${settings.pageMargin}px`,
    `--re-panel-padding:${settings.pageMargin}px`,
    `--re-text-align:${settings.textJustify ? "justify" : "start"}`,
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
    padding: var(--re-outer-gap) 0 calc(4 * var(--re-outer-gap));
  }
  .article {
    --re-effective-padding: var(--re-panel-padding);
    width: min(
      calc(var(--re-content-width) + 2 * var(--re-panel-padding)),
      calc(100% - 2 * var(--re-page-margin))
    );
    min-height: calc(100vh - 5 * var(--re-outer-gap)); margin: 0 auto;
    padding: 72px var(--re-effective-padding);
    background: var(--re-surface);
    box-shadow: var(--re-paper-shadow);
    border: 1px solid var(--re-paper-border);
    border-radius: 3px;
  }
  .source { color: var(--re-muted); font: 600 12px/1.4 ui-sans-serif, system-ui; letter-spacing: .08em; text-transform: uppercase; }
  h1.title { margin: 12px 0 14px; font-size: clamp(2rem, 5vw, 3.4rem); line-height: 1.14; letter-spacing: -.035em; }
  .meta { color: var(--re-muted); font: 14px/1.5 ui-sans-serif, system-ui; margin-bottom: 42px; }
  .content p { margin: 0 0 var(--re-paragraph-spacing); }
  .content p, .content li, .content blockquote {
    text-align: var(--re-text-align);
    text-align-last: start;
    text-justify: auto;
    line-break: strict;
    word-break: normal;
    overflow-wrap: break-word;
    text-autospace: no-autospace;
  }
  .content h2, .content h3, .content h4 { margin: 2em 0 .75em; line-height: 1.3; }
  .content img { display: block; max-width: 100%; height: auto; margin: 2em auto; border-radius: 3px; }
  .content img[data-read-ease-wide] {
    width: calc(100% + 2 * var(--re-effective-padding));
    max-width: none;
    margin-left: calc(-1 * var(--re-effective-padding));
    margin-right: calc(-1 * var(--re-effective-padding));
    border-radius: 0;
  }
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
  .popover {
    position: fixed; top: 62px; right: 20px; z-index: 3; width: 368px;
    max-height: calc(100vh - 82px); overflow: auto; padding: 18px;
    border: 1px solid color-mix(in srgb, var(--re-foreground) 11%, transparent);
    border-radius: 13px;
    background: color-mix(in srgb, var(--re-panel) 92%, transparent);
    box-shadow: 0 22px 64px #0004, 0 2px 8px #0002;
    backdrop-filter: blur(28px) saturate(1.35);
    font: 13px/1.35 -apple-system, BlinkMacSystemFont, "SF Pro Text", ui-sans-serif, system-ui;
    scrollbar-width: thin;
  }
  .popover[hidden] { display: none; }
  .popover-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 1px 2px 15px; }
  .popover h2 { margin: 0; font-size: 17px; line-height: 1.25; letter-spacing: -.015em; }
  .popover-subtitle { margin: 3px 0 0; color: var(--re-muted); font-size: 11px; }
  .settings-section { margin-top: 12px; }
  .section-heading { display: flex; align-items: baseline; gap: 7px; margin: 0 8px 6px; }
  .section-heading h3 { margin: 0; color: var(--re-muted); font-size: 11px; font-weight: 500; }
  .section-eyebrow { color: #0a84ff; font-size: 11px; font-weight: 650; }
  .settings-group {
    overflow: hidden; border: 1px solid color-mix(in srgb, var(--re-foreground) 10%, transparent);
    border-radius: 10px; background: color-mix(in srgb, var(--re-panel) 78%, var(--re-background));
    box-shadow: 0 1px 2px #0001;
  }
  .setting-row { min-height: 47px; margin: 0; padding: 9px 11px; color: var(--re-foreground); }
  .setting-row + .setting-row, .width-presets { border-top: 1px solid color-mix(in srgb, var(--re-foreground) 9%, transparent); }
  .setting-copy { display: grid; gap: 2px; min-width: 0; }
  .setting-title { font-size: 12px; font-weight: 540; }
  .setting-description { color: var(--re-muted); font-size: 10px; font-weight: 400; }
  .font-field, .switch-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
  .font-field select { width: 150px; flex: none; }
  .range-row { display: grid; grid-template-columns: 58px 1fr; align-items: center; gap: 10px; }
  .range-control { display: grid; grid-template-columns: 1fr 38px; align-items: center; gap: 8px; }
  .range-control input[type=range] { width: 100%; accent-color: #0a84ff; }
  .range-control output { text-align: right; color: var(--re-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
  .width-presets { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 9px 10px 10px; }
  .width-presets button { display: grid; gap: 2px; padding: 7px 3px; border: 1px solid color-mix(in srgb, var(--re-foreground) 11%, transparent); border-radius: 7px; color: var(--re-muted); background: color-mix(in srgb, var(--re-panel) 70%, transparent); }
  .width-presets button:hover { background: color-mix(in srgb, var(--re-foreground) 6%, transparent); }
  .width-presets button[aria-pressed=true] { color: #fff; border-color: #0a84ff; background: #0a84ff; box-shadow: 0 1px 2px #0002; }
  .width-presets small { font-size: 9px; font-weight: 500; opacity: .78; }
  .themes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; padding: 10px; }
  .theme { display: grid; gap: 5px; justify-items: center; padding: 0 0 5px; border-radius: 8px; color: var(--re-muted); font-size: 10px; font-weight: 500; }
  .theme:hover { background: color-mix(in srgb, var(--re-foreground) 5%, transparent); }
  .theme-swatch { position: relative; width: 100%; height: 29px; overflow: hidden; border: 1px solid #0002; border-radius: 6px; box-shadow: inset 0 0 0 1px #fff2; }
  .theme-paper { position: absolute; top: 5px; right: 6px; bottom: 0; left: 17px; border: 1px solid #0002; border-radius: 2px 2px 0 0; box-shadow: 0 2px 6px #0004; }
  .theme[aria-pressed=true] { color: #0a84ff; background: color-mix(in srgb, #0a84ff 9%, transparent); }
  .theme[aria-pressed=true] .theme-swatch { outline: 2px solid #0a84ff; outline-offset: 1px; }
  select { min-width: 0; padding: 5px 24px 5px 8px; border: 1px solid color-mix(in srgb, var(--re-foreground) 15%, transparent); border-radius: 6px; background: var(--re-background); color: var(--re-foreground); font: 11px -apple-system, BlinkMacSystemFont, system-ui; }
  .switch-control { position: relative; display: block; width: 31px; height: 19px; flex: none; }
  .switch-control input { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
  .switch-track { position: absolute; inset: 0; border-radius: 999px; background: color-mix(in srgb, var(--re-foreground) 20%, transparent); box-shadow: inset 0 0 0 1px #0001; transition: background .16s ease; }
  .switch-track::after { content: ""; position: absolute; top: 2px; left: 2px; width: 15px; height: 15px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px #0005; transition: transform .16s ease; }
  .switch-control input:checked + .switch-track { background: #0a84ff; }
  .switch-control input:checked + .switch-track::after { transform: translateX(12px); }
  .switch-control input:focus-visible + .switch-track { outline: 2px solid #0a84ff; outline-offset: 2px; }
  .popover-footer { margin-top: 14px; display: grid; gap: 8px; }
  .copy-markdown { width: 100%; padding: 9px 12px; border-radius: 7px; color: #fff; background: #0a84ff; text-align: center; box-shadow: 0 1px 2px #0002; }
  .copy-markdown:hover { background: #0077ed; }
  .copy-markdown:disabled { cursor: default; opacity: .78; }
  .secondary-actions { display: flex; justify-content: space-between; gap: 8px; }
  .link-button { padding: 5px 2px; color: var(--re-muted); font-size: 11px; font-weight: 500; }
  .link-button:hover { color: #0a84ff; }
  @media (max-width: 640px) {
    .overlay { --re-outer-gap: 10px; }
    .article {
      --re-effective-padding: max(20px, var(--re-page-margin));
      width: calc(100% - 16px);
      min-height: calc(100vh - 5 * var(--re-outer-gap));
      padding: 82px var(--re-effective-padding);
      border-radius: 2px;
    }
    .popover { left: 16px; right: 16px; width: auto; }
  }
`;
