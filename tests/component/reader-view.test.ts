import { describe, expect, it, vi } from "vitest";
import type { Article } from "../../src/domain/article";
import { DEFAULT_SETTINGS } from "../../src/domain/settings";
import {
  mountReaderView,
  updateWideImageLayout,
} from "../../src/ui/reader-view";

const article: Article = {
  title: "A quiet article",
  byline: "Author",
  publishedTime: null,
  siteName: "Example",
  excerpt: null,
  leadImage: null,
  contentHtml: "<p>Article text</p>",
  textContent: "Article text",
  sourceUrl: "https://example.com/article",
  readingMinutes: 3,
};

describe("reader view", () => {
  it("expands images that are at least 80 percent of the content width", () => {
    const content = document.createElement("div");
    const wide = document.createElement("img");
    const small = document.createElement("img");
    Object.defineProperty(content, "clientWidth", { value: 1000 });
    Object.defineProperty(wide, "naturalWidth", { value: 800 });
    Object.defineProperty(small, "naturalWidth", { value: 799 });
    content.append(wide, small);
    updateWideImageLayout(content);
    expect(wide.hasAttribute("data-read-ease-wide")).toBe(true);
    expect(small.hasAttribute("data-read-ease-wide")).toBe(false);
  });

  it("mounts isolated content and unmounts without changing the source page", () => {
    const source = document.createElement("main");
    source.textContent = "Original page";
    document.body.append(source);
    const onSettingsChange = vi.fn();
    const handle = mountReaderView(
      article,
      article.contentHtml,
      DEFAULT_SETTINGS,
      {
        onExit: vi.fn(),
        onSettingsChange,
        onResetSettings: vi.fn(),
        onEditRule: vi.fn(),
        onAutoEnterChange: vi.fn(),
        autoEnter: false,
      },
    );
    const host = document.querySelector<HTMLElement>("[data-read-ease-host]");
    expect(host?.shadowRoot?.textContent).toContain("A quiet article");
    expect(source.textContent).toBe("Original page");
    const fontOptions = [
      ...(host?.shadowRoot?.querySelectorAll("select option") ?? []),
    ].map((option) => option.textContent);
    expect(fontOptions).toEqual([
      "衬线（系统默认）",
      "无衬线（系统默认）",
      "中文宋体",
      "网页原字体",
    ]);
    const grayTheme = host?.shadowRoot?.querySelector<HTMLButtonElement>(
      '[data-theme="gray"]',
    );
    expect(grayTheme?.title).toBe("灰色");
    const widthPresets = [
      ...(host?.shadowRoot?.querySelectorAll<HTMLButtonElement>(
        "[data-width-preset]",
      ) ?? []),
    ];
    expect(widthPresets.map((button) => button.dataset.widthPreset)).toEqual([
      "640",
      "720",
      "800",
      "920",
    ]);
    widthPresets[2]?.click();
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ contentWidth: 800 }),
      "global",
    );
    expect(
      host?.shadowRoot?.querySelector('[data-action="copy-markdown"]')
        ?.textContent,
    ).toBe("复制 Markdown");
    const justify = host?.shadowRoot?.querySelector<HTMLInputElement>(
      '[data-setting="text-justify"]',
    );
    expect(justify?.checked).toBe(false);
    justify?.click();
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ textJustify: true }),
      "global",
    );
    const readerCss = host?.shadowRoot?.querySelector("style")?.textContent ?? "";
    expect(readerCss).toContain("--re-outer-gap: clamp(20px, 3vw, 44px)");
    expect(readerCss).toContain(
      "min-height: calc(100vh - 2 * var(--re-outer-gap))",
    );
    expect(readerCss).toContain("border-radius: 3px");
    expect(readerCss).toContain(
      ".content img { display: block; max-width: 100%; height: auto; margin: 2em auto; border-radius: 3px; }",
    );
    expect(readerCss).toContain(
      "width: calc(100% + 2 * var(--re-effective-padding))",
    );
    expect(readerCss).toContain(
      "margin-left: calc(-1 * var(--re-effective-padding))",
    );
    expect(readerCss).toMatch(
      /\.content img\[data-read-ease-wide\][\s\S]*?border-radius: 0;/,
    );
    handle.updateSettings({ ...DEFAULT_SETTINGS, pageMargin: 64 });
    const overlay =
      host?.shadowRoot?.querySelector<HTMLElement>(".overlay") ?? null;
    expect(overlay?.style.getPropertyValue("--re-page-margin")).toBe("64px");
    expect(overlay?.style.getPropertyValue("--re-panel-padding")).toBe("64px");
    handle.unmount();
    expect(document.querySelector("[data-read-ease-host]")).toBeNull();
    expect(source.textContent).toBe("Original page");
  });
});
