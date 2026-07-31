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
  onCopyMarkdown(): Promise<boolean>;
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

const WIDTH_PRESETS = [
  { label: "紧凑", value: 640, margin: 40 },
  { label: "标准", value: 720, margin: 52 },
  { label: "宽松", value: 800, margin: 64 },
  { label: "宽屏", value: 920, margin: 72 },
] as const;

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
  const header = element("header", { class: "popover-header" });
  const titleBlock = element("div");
  const title = element("h2");
  title.textContent = "阅读外观";
  const subtitle = element("p", { class: "popover-subtitle" });
  subtitle.textContent = "专注阅读，按你的习惯排版";
  titleBlock.append(title, subtitle);
  header.append(titleBlock);
  container.append(header);

  function createGroup(
    section: string,
    eyebrow: string,
    heading: string,
  ): HTMLElement {
    const wrapper = element("section", {
      class: "settings-section",
      "data-section-wrapper": section,
    });
    const sectionHeading = element("div", { class: "section-heading" });
    const eyebrowNode = element("span", { class: "section-eyebrow" });
    eyebrowNode.textContent = eyebrow;
    const headingNode = element("h3");
    headingNode.textContent = heading;
    sectionHeading.append(eyebrowNode, headingNode);
    const group = element("div", {
      class: "settings-group",
      "data-section": section,
    });
    wrapper.append(sectionHeading, group);
    container.append(wrapper);
    return group;
  }

  const appearanceGroup = createGroup("appearance", "外观", "阅读环境");

  const themes = element("div", { class: "themes" });
  const themeButtons = new Map<ReaderTheme, HTMLButtonElement>();
  const themeColors: Record<
    ReaderTheme,
    { background: string; paper: string }
  > = {
    light: { background: "#d9d9d7", paper: "#ffffff" },
    sepia: { background: "#cfc2ab", paper: "#fff3dc" },
    gray: { background: "#202124", paper: "#494a4d" },
    dark: { background: "#050607", paper: "#171819" },
  };
  const themeLabels: Record<ReaderTheme, string> = {
    light: "浅色",
    sepia: "米色",
    gray: "灰色",
    dark: "深色",
  };
  for (const theme of ["light", "sepia", "gray", "dark"] as const) {
    const button = element("button", {
      class: "theme",
      type: "button",
      "data-theme": theme,
      title: themeLabels[theme],
    });
    const swatch = element("span", { class: "theme-swatch" });
    swatch.style.background = themeColors[theme].background;
    const paper = element("span", { class: "theme-paper" });
    paper.style.background = themeColors[theme].paper;
    swatch.append(paper);
    const label = element("span", { class: "theme-label" });
    label.textContent = themeLabels[theme];
    button.append(swatch, label);
    button.addEventListener("click", () => {
      settings = { ...settings, theme };
      emit();
    });
    themeButtons.set(theme, button);
    themes.append(button);
  }
  appearanceGroup.append(themes);

  const fontRow = element("label", { class: "setting-row font-field" });
  const fontCopy = element("span", { class: "setting-copy" });
  const fontTitle = element("span", { class: "setting-title" });
  fontTitle.textContent = "字体";
  const fontDescription = element("span", { class: "setting-description" });
  fontDescription.textContent = "选择适合长时间阅读的字形";
  fontCopy.append(fontTitle, fontDescription);
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
  fontRow.append(fontCopy, font);
  appearanceGroup.append(fontRow);

  const typographyGroup = createGroup("typography", "排版", "文字节奏");
  const layoutGroup = createGroup("layout", "版面", "页面尺寸");

  const rangeInputs = new Map<keyof ReaderSettings, HTMLInputElement>();
  const outputs = new Map<keyof ReaderSettings, HTMLOutputElement>();
  for (const field of RANGE_FIELDS) {
    const row = element("label", { class: "setting-row range-row" });
    const fieldLabel = element("span", { class: "setting-title" });
    fieldLabel.textContent = field.label;
    const control = element("span", { class: "range-control" });
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
    control.append(input, output);
    row.append(fieldLabel, control);
    const target =
      field.key === "contentWidth" || field.key === "pageMargin"
        ? layoutGroup
        : typographyGroup;
    target.append(row);
  }

  const widthPresets = element("div", { class: "width-presets" });
  const widthPresetButtons = new Map<number, HTMLButtonElement>();
  for (const preset of WIDTH_PRESETS) {
    const button = element("button", {
      type: "button",
      "data-width-preset": String(preset.value),
      title: `${preset.label}：正文 ${preset.value}px，边距 ${preset.margin}px`,
    });
    button.innerHTML = `<span>${preset.label}</span><small>${preset.value} / ${preset.margin}</small>`;
    button.addEventListener("click", () => {
      settings = {
        ...settings,
        contentWidth: preset.value,
        pageMargin: preset.margin,
      };
      emit();
    });
    widthPresetButtons.set(preset.value, button);
    widthPresets.append(button);
  }
  layoutGroup.append(widthPresets);

  const websiteGroup = createGroup("website", "网站", "应用范围");

  function createSwitchRow(
    titleText: string,
    descriptionText: string,
    input: HTMLInputElement,
  ): HTMLLabelElement {
    const row = element("label", { class: "setting-row switch-row" });
    const copy = element("span", { class: "setting-copy" });
    const rowTitle = element("span", { class: "setting-title" });
    rowTitle.textContent = titleText;
    const description = element("span", { class: "setting-description" });
    description.textContent = descriptionText;
    const toggle = element("span", { class: "switch-control" });
    copy.append(rowTitle, description);
    toggle.append(input, element("span", { class: "switch-track" }));
    row.append(copy, toggle);
    return row;
  }

  const justifyCheckbox = element("input", {
    type: "checkbox",
    "data-setting": "text-justify",
  });
  justifyCheckbox.addEventListener("change", () => {
    settings = { ...settings, textJustify: justifyCheckbox.checked };
    emit();
  });
  const justifyLabel = createSwitchRow(
    "正文两端对齐",
    "让段落左右边缘整齐对齐",
    justifyCheckbox,
  );
  const siteOnly = element("input", {
    type: "checkbox",
    "data-setting": "site-only",
  });
  const siteLabel = createSwitchRow(
    "仅用于此网站",
    "将当前外观保存为网站专属设置",
    siteOnly,
  );
  const autoCheckbox = element("input", {
    type: "checkbox",
    "data-setting": "auto-enter",
  });
  autoCheckbox.checked = autoEnter;
  autoCheckbox.addEventListener("change", () => {
    callbacks.onAutoEnterChange(autoCheckbox.checked);
  });
  const autoLabel = createSwitchRow(
    "自动进入阅读模式",
    "下次访问此网站时自动开启",
    autoCheckbox,
  );
  websiteGroup.append(justifyLabel, siteLabel, autoLabel);

  const footer = element("footer", { class: "popover-footer" });
  const editRule = element("button", { type: "button", class: "link-button" });
  editRule.textContent = "修正此网站";
  editRule.addEventListener("click", callbacks.onEditRule);
  const copyMarkdown = element("button", {
    type: "button",
    class: "copy-markdown",
    "data-action": "copy-markdown",
  });
  copyMarkdown.textContent = "复制 Markdown";
  copyMarkdown.addEventListener("click", async () => {
    copyMarkdown.disabled = true;
    copyMarkdown.textContent = "正在生成…";
    const copied = await callbacks.onCopyMarkdown();
    copyMarkdown.textContent = copied ? "✓ 已复制 Markdown" : "复制失败，请重试";
    window.setTimeout(() => {
      copyMarkdown.disabled = false;
      copyMarkdown.textContent = "复制 Markdown";
    }, 1800);
  });
  const reset = element("button", { type: "button", class: "link-button" });
  reset.textContent = "恢复默认设置";
  reset.addEventListener("click", () => callbacks.onReset(scope()));
  const secondaryActions = element("div", { class: "secondary-actions" });
  secondaryActions.append(editRule, reset);
  footer.append(copyMarkdown, secondaryActions);
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
    justifyCheckbox.checked = next.textJustify;
    font.value = next.fontFamily;
    for (const [key, input] of rangeInputs) {
      input.value = String(next[key]);
      const output = outputs.get(key);
      if (output) output.value = String(next[key]);
    }
    for (const [theme, button] of themeButtons) {
      button.setAttribute("aria-pressed", String(theme === next.theme));
    }
    for (const [width, button] of widthPresetButtons) {
      const preset = WIDTH_PRESETS.find((candidate) => candidate.value === width);
      button.setAttribute(
        "aria-pressed",
        String(
          width === next.contentWidth && preset?.margin === next.pageMargin,
        ),
      );
    }
  }

  update(initial);
  return { element: container, update, scope };
}
