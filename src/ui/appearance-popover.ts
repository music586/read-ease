import {
  CHINESE_SONG_FONT,
  PAGE_DEFAULT_FONT,
  SYSTEM_SANS_FONT,
  SYSTEM_SERIF_FONT,
  type ReaderSettings,
  type ReaderTheme,
} from "../domain/settings";

export type SettingsScope = "global" | "site";

export interface AppearanceCallbacks {
  onChange(settings: ReaderSettings, scope: SettingsScope): void;
  onReset(scope: SettingsScope): void;
  onEditRule(): void;
  onAutoEnterChange(enabled: boolean): void;
}

const RANGE_FIELDS: Array<{
  key: keyof Pick<
    ReaderSettings,
    | "fontSize"
    | "letterSpacing"
    | "lineHeight"
    | "paragraphSpacing"
    | "contentWidth"
    | "pageMargin"
  >;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { key: "fontSize", label: "字号", min: 14, max: 30, step: 1 },
  { key: "letterSpacing", label: "字距", min: -0.03, max: 0.12, step: 0.01 },
  { key: "lineHeight", label: "行距", min: 1.3, max: 2.4, step: 0.05 },
  { key: "paragraphSpacing", label: "段距", min: 0.4, max: 2.2, step: 0.05 },
  { key: "contentWidth", label: "宽度", min: 480, max: 1000, step: 20 },
  { key: "pageMargin", label: "边距", min: 12, max: 96, step: 4 },
];

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
  return node;
}

export function createAppearancePopover(
  initial: ReaderSettings,
  callbacks: AppearanceCallbacks,
  autoEnter = false,
): {
  element: HTMLElement;
  update(settings: ReaderSettings): void;
  scope(): SettingsScope;
} {
  let settings = initial;
  const container = element("section", { class: "popover", hidden: "" });
  const title = element("h2");
  title.textContent = "阅读外观";
  container.append(title);

  const themes = element("div", { class: "themes" });
  const themeButtons = new Map<ReaderTheme, HTMLButtonElement>();
  const themeColors: Record<ReaderTheme, string> = {
    light: "#fbfbfa",
    sepia: "#f0e5cf",
    dark: "#242526",
  };
  for (const theme of ["light", "sepia", "dark"] as const) {
    const button = element("button", {
      class: "theme",
      type: "button",
      "data-theme": theme,
      title: theme,
    });
    button.style.background = themeColors[theme];
    button.addEventListener("click", () => {
      settings = { ...settings, theme };
      emit();
    });
    themeButtons.set(theme, button);
    themes.append(button);
  }
  container.append(themes);

  const fontRow = element("label", { class: "field font-field" });
  fontRow.append(document.createTextNode("字体"));
  const font = element("select", { "data-setting": "font-family" });
  const fonts = [
    ["衬线（系统默认）", SYSTEM_SERIF_FONT],
    ["无衬线（系统默认）", SYSTEM_SANS_FONT],
    ["中文宋体", CHINESE_SONG_FONT],
    ["网页原字体", PAGE_DEFAULT_FONT],
  ];
  for (const [label, value] of fonts) {
    const option = element("option");
    option.value = value ?? "";
    option.textContent = label ?? "";
    font.append(option);
  }
  font.addEventListener("change", () => {
    settings = { ...settings, fontFamily: font.value };
    emit();
  });
  fontRow.append(font);
  container.append(fontRow);

  const rangeInputs = new Map<keyof ReaderSettings, HTMLInputElement>();
  const outputs = new Map<keyof ReaderSettings, HTMLOutputElement>();
  for (const field of RANGE_FIELDS) {
    const row = element("label", { class: "field" });
    row.append(document.createTextNode(field.label));
    const input = element("input", {
      type: "range",
      min: String(field.min),
      max: String(field.max),
      step: String(field.step),
      "data-setting": field.key,
    });
    const output = element("output");
    input.addEventListener("input", () => {
      settings = { ...settings, [field.key]: Number(input.value) };
      output.value = input.value;
      emit();
    });
    rangeInputs.set(field.key, input);
    outputs.set(field.key, output);
    row.append(input, output);
    container.append(row);
  }

  const footer = element("div", { class: "popover-footer" });
  const siteLabel = element("label", { class: "checkbox" });
  const siteOnly = element("input", {
    type: "checkbox",
    "data-setting": "site-only",
  });
  siteLabel.append(siteOnly, document.createTextNode("仅此网站使用这些设置"));
  const autoLabel = element("label", { class: "checkbox" });
  const autoCheckbox = element("input", {
    type: "checkbox",
    "data-setting": "auto-enter",
  });
  autoCheckbox.checked = autoEnter;
  autoCheckbox.addEventListener("change", () => {
    callbacks.onAutoEnterChange(autoCheckbox.checked);
  });
  autoLabel.append(autoCheckbox, document.createTextNode("访问此网站时自动进入"));
  const editRule = element("button", { type: "button", class: "link-button" });
  editRule.textContent = "修正此网站";
  editRule.addEventListener("click", callbacks.onEditRule);
  const reset = element("button", { type: "button", class: "link-button" });
  reset.textContent = "恢复默认设置";
  reset.addEventListener("click", () => callbacks.onReset(scope()));
  footer.append(siteLabel, autoLabel, editRule, reset);
  container.append(footer);

  function scope(): SettingsScope {
    return siteOnly.checked ? "site" : "global";
  }

  function emit(): void {
    update(settings);
    callbacks.onChange(settings, scope());
  }

  function update(next: ReaderSettings): void {
    settings = next;
    font.value = next.fontFamily;
    for (const [key, input] of rangeInputs) {
      input.value = String(next[key]);
      const output = outputs.get(key);
      if (output) output.value = String(next[key]);
    }
    for (const [theme, button] of themeButtons) {
      button.setAttribute("aria-pressed", String(theme === next.theme));
    }
  }

  update(initial);
  return { element: container, update, scope };
}
