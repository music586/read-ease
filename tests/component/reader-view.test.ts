import { describe, expect, it, vi } from "vitest";
import type { Article } from "../../src/domain/article";
import { DEFAULT_SETTINGS } from "../../src/domain/settings";
import {
  imageTransitionTransform,
  mountReaderView,
  normalizeProseBlocks,
  normalizeProseLineBreaks,
  updateReadingProgress,
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
  it("calculates a FLIP transform from the full-screen image back to its article position", () => {
    expect(
      imageTransitionTransform(
        { left: 10, top: 20, width: 200, height: 100 },
        { left: 100, top: 80, width: 800, height: 400 },
      ),
    ).toBe("translate(-390px, -210px) scale(0.25, 0.25)");
  });

  it("turns WeChat leaf sections into paragraphs but preserves media layouts", () => {
    const content = document.createElement("div");
    content.innerHTML = `<section><span>微信正文内容</span></section><section><img src="image.jpg"></section><section><section><span>嵌套布局</span></section></section>`;

    normalizeProseBlocks(content);

    expect(content.querySelector("p")?.textContent).toBe("微信正文内容");
    expect(content.querySelector("section > img")).not.toBeNull();
    expect(content.querySelector("section > section")).not.toBeNull();
  });

  it("reflows single hard breaks inside long prose while preserving blank lines", () => {
    const content = document.createElement("div");
    content.innerHTML = `<p>电力供给已成为制约全球产业发展的关键瓶颈。<br>美国数据中心用电量仍在快速增长，电网老化严重。<br>科技企业正在重新布局能源。<br><br>第二部分保持分隔。</p>`;

    normalizeProseLineBreaks(content);

    const paragraph = content.querySelector("p");
    expect(paragraph?.querySelectorAll("br")).toHaveLength(2);
    expect(paragraph?.textContent).toContain("瓶颈。美国数据中心");
    expect(paragraph?.textContent).toContain("严重。科技企业");
  });

  it("keeps one separator when a hard break splits Latin words", () => {
    const content = document.createElement("div");
    content.innerHTML = `<p>${"Long English prose ".repeat(4)}power<br>purchase agreement remains important.</p>`;

    normalizeProseLineBreaks(content);

    expect(content.querySelector("p")?.textContent).toContain(
      "power purchase agreement",
    );
  });

  it("removes non-semantic spaces around Chinese punctuation", () => {
    const content = document.createElement("div");
    content.innerHTML = `<p>电力供给成为关键瓶颈。 据实验室预测， 美国数据中心用电增长。 面对电力瓶颈， 科技企业重新布局。 ${"正文内容".repeat(12)}</p>`;

    normalizeProseLineBreaks(content);

    expect(content.querySelector("p")?.textContent).toContain(
      "关键瓶颈。据实验室预测，美国数据中心用电增长。面对电力瓶颈，科技企业重新布局。",
    );
  });

  it("removes spacing around Latin tokens in Chinese but preserves English phrases", () => {
    const content = document.createElement("div");
    content.innerHTML = `<p>${"正文内容".repeat(12)}全球 AI 产业使用 power purchase agreement 支撑数据中心。</p>`;

    normalizeProseLineBreaks(content);

    expect(content.querySelector("p")?.textContent).toContain(
      "全球AI产业使用power purchase agreement支撑数据中心。",
    );
  });

  it("removes Chinese spacing split across inline elements", () => {
    const content = document.createElement("div");
    content.innerHTML = `<p>${"正文内容".repeat(12)}<span>关键瓶颈。</span> <span>据实验室预测， </span><em>美国数据中心</em> 用电增长。</p>`;

    normalizeProseLineBreaks(content);

    expect(content.querySelector("p")?.textContent).toContain(
      "关键瓶颈。据实验室预测，美国数据中心用电增长。",
    );
  });

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

  it("shows reading progress only when the whole page exceeds three screens", () => {
    const overlay = document.createElement("div");
    const progress = document.createElement("div");
    Object.defineProperties(overlay, {
      clientHeight: { value: 1000 },
      scrollHeight: { value: 3000, configurable: true },
      scrollTop: { value: 0, writable: true },
    });

    updateReadingProgress(overlay, progress);
    expect(progress.hidden).toBe(true);

    Object.defineProperty(overlay, "scrollHeight", { value: 3001 });
    updateReadingProgress(overlay, progress);
    expect(progress.hidden).toBe(false);
  });

  it("updates reading progress from the top to the bottom of the whole page", () => {
    const overlay = document.createElement("div");
    const progress = document.createElement("div");
    Object.defineProperties(overlay, {
      clientHeight: { value: 1000 },
      scrollHeight: { value: 4000 },
      scrollTop: { value: 1500, writable: true },
    });

    updateReadingProgress(overlay, progress);

    expect(progress.style.transform).toBe("scaleX(0.5)");
    expect(progress.getAttribute("aria-valuenow")).toBe("50");
  });

  it("reads and restores the reader scroll position within its current range", () => {
    const handle = mountReaderView(
      article,
      article.contentHtml,
      DEFAULT_SETTINGS,
      {
        onExit: vi.fn(),
        onSettingsChange: vi.fn(),
        onResetSettings: vi.fn(),
        onEditRule: vi.fn(),
        onAutoEnterChange: vi.fn(),
        autoEnter: false,
      },
    );
    const overlay = document
      .querySelector<HTMLElement>("[data-read-ease-host]")
      ?.shadowRoot?.querySelector<HTMLElement>(".overlay");
    Object.defineProperties(overlay, {
      clientHeight: { value: 600 },
      scrollHeight: { value: 1800 },
      scrollTop: { value: 0, writable: true },
    });

    handle.restoreScrollPosition(1600);

    expect(handle.getScrollPosition()).toBe(1200);
    expect(overlay?.scrollTop).toBe(1200);
    handle.unmount({ immediate: true });
  });

  it("opens article images in a modal preview and closes it from the backdrop", () => {
    const handle = mountReaderView(
      article,
      '<p>Before</p><img src="https://example.com/photo.jpg" alt="山间照片"><p>After</p>',
      DEFAULT_SETTINGS,
      {
        onExit: vi.fn(),
        onSettingsChange: vi.fn(),
        onResetSettings: vi.fn(),
        onEditRule: vi.fn(),
        onAutoEnterChange: vi.fn(),
        autoEnter: false,
      },
    );
    const shadow = document.querySelector<HTMLElement>("[data-read-ease-host]")
      ?.shadowRoot;
    const articleImage = shadow?.querySelector<HTMLImageElement>(".content img");
    const preview = shadow?.querySelector<HTMLElement>(".image-preview");

    articleImage?.click();

    expect(preview?.hidden).toBe(false);
    expect(preview?.getAttribute("role")).toBe("dialog");
    expect(preview?.getAttribute("aria-modal")).toBe("true");
    expect(
      preview?.querySelector<HTMLImageElement>(".image-preview-media")?.src,
    ).toBe("https://example.com/photo.jpg");
    expect(
      preview?.querySelector<HTMLImageElement>(".image-preview-media")?.alt,
    ).toBe("山间照片");
    const closeButton = preview?.querySelector<HTMLButtonElement>(
      ".image-preview-close",
    );
    expect(
      preview?.querySelector<HTMLElement>(".image-preview-title")?.textContent,
    ).toBe("A quiet article");
    expect(closeButton?.textContent?.trim()).toBe("");
    expect(closeButton?.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(closeButton?.querySelector("path")?.getAttribute("stroke-width")).toBe(
      "2.2",
    );

    preview?.click();
    expect(preview?.hidden).toBe(true);
    handle.unmount({ immediate: true });
  });

  it("consumes the first Escape for an open image preview and leaves the next Escape to the reader", () => {
    const handle = mountReaderView(
      article,
      '<img src="https://example.com/photo.jpg" alt="预览图片">',
      DEFAULT_SETTINGS,
      {
        onExit: vi.fn(),
        onSettingsChange: vi.fn(),
        onResetSettings: vi.fn(),
        onEditRule: vi.fn(),
        onAutoEnterChange: vi.fn(),
        autoEnter: false,
      },
    );
    const shadow = document.querySelector<HTMLElement>("[data-read-ease-host]")
      ?.shadowRoot;
    shadow?.querySelector<HTMLImageElement>(".content img")?.click();

    expect(handle.closeImagePreview()).toBe(true);
    expect(shadow?.querySelector<HTMLElement>(".image-preview")?.hidden).toBe(
      true,
    );
    expect(handle.closeImagePreview()).toBe(false);

    handle.unmount({ immediate: true });
  });

  it("animates the reader in and delays removal while it animates out", () => {
    vi.useFakeTimers();
    const animationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    const handle = mountReaderView(
      article,
      article.contentHtml,
      DEFAULT_SETTINGS,
      {
        onExit: vi.fn(),
        onSettingsChange: vi.fn(),
        onResetSettings: vi.fn(),
        onEditRule: vi.fn(),
        onAutoEnterChange: vi.fn(),
        autoEnter: false,
      },
    );
    const host = document.querySelector<HTMLElement>("[data-read-ease-host]");
    const overlay = host?.shadowRoot?.querySelector<HTMLElement>(".overlay");

    expect(overlay?.dataset.transitionState).toBe("visible");
    handle.unmount();
    expect(overlay?.dataset.transitionState).toBe("exiting");
    expect(document.querySelector("[data-read-ease-host]")).not.toBeNull();

    vi.advanceTimersByTime(250);
    expect(document.querySelector("[data-read-ease-host]")).toBeNull();
    animationFrame.mockRestore();
    vi.useRealTimers();
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
    expect(host?.shadowRoot?.querySelector(".reading-progress")).not.toBeNull();
    expect(source.textContent).toBe("Original page");
    expect(host?.shadowRoot?.querySelector(".content")?.getAttribute("lang"))
      .toBe("zh-CN");
    const fontOptions = [
      ...(host?.shadowRoot?.querySelectorAll("select option") ?? []),
    ].map((option) => option.textContent);
    expect(fontOptions).toEqual([
      "衬线（系统默认）",
      "无衬线（系统默认）",
      "中文宋体",
      "网页原字体",
    ]);
    const settingsGroups = [
      ...(host?.shadowRoot?.querySelectorAll<HTMLElement>(
        ".settings-group[data-section]",
      ) ?? []),
    ].map((group) => group.dataset.section);
    expect(settingsGroups).toEqual([
      "appearance",
      "typography",
      "layout",
      "website",
    ]);
    expect(
      host?.shadowRoot?.querySelector(".popover-subtitle")?.textContent,
    ).toBe("专注阅读，按你的习惯排版");
    expect(host?.shadowRoot?.querySelector(".traffic-lights")).toBeNull();
    expect(
      host?.shadowRoot?.querySelector('[data-setting="text-justify"]')
        ?.closest(".setting-row")
        ?.querySelector(".setting-description")?.textContent,
    ).toBe("让段落左右边缘整齐对齐");
    const grayTheme = host?.shadowRoot?.querySelector<HTMLButtonElement>(
      '[data-theme="gray"]',
    );
    expect(grayTheme?.title).toBe("灰色");
    expect(
      grayTheme?.querySelector<HTMLElement>(".theme-swatch")?.style.background,
    ).toBe("rgb(32, 33, 36)");
    expect(
      grayTheme?.querySelector<HTMLElement>(".theme-paper")?.style.background,
    ).toBe("rgb(73, 74, 77)");
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
      expect.objectContaining({ contentWidth: 800, pageMargin: 64 }),
      "global",
    );
    expect(
      host?.shadowRoot?.querySelector('[data-action="copy-markdown"]')
        ?.textContent,
    ).toBe("复制 Markdown");
    const justify = host?.shadowRoot?.querySelector<HTMLInputElement>(
      '[data-setting="text-justify"]',
    );
    expect(justify?.checked).toBe(true);
    justify?.click();
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ textJustify: false }),
      "global",
    );
    const readerCss = host?.shadowRoot?.querySelector("style")?.textContent ?? "";
    expect(readerCss).toContain("--re-outer-gap: clamp(20px, 3vw, 44px)");
    expect(readerCss).toContain(
      "padding: var(--re-outer-gap) 0 calc(4 * var(--re-outer-gap))",
    );
    expect(readerCss).toContain(
      "min-height: calc(100vh - 5 * var(--re-outer-gap))",
    );
    expect(readerCss).toContain("padding: 72px var(--re-effective-padding)");
    expect(readerCss).toContain("padding: 82px var(--re-effective-padding)");
    expect(readerCss).toContain("border-radius: 3px");
    expect(readerCss).toContain(
      ".content img { display: block; max-width: 100%; height: auto; margin: 2em auto; border-radius: 3px; cursor: zoom-in; }",
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
    handle.unmount({ immediate: true });
    expect(document.querySelector("[data-read-ease-host]")).toBeNull();
    expect(source.textContent).toBe("Original page");
  });
});
