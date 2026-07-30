import { describe, expect, it, vi } from "vitest";
import type { Article } from "../../src/domain/article";
import { DEFAULT_SETTINGS } from "../../src/domain/settings";
import { mountReaderView } from "../../src/ui/reader-view";

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
  it("mounts isolated content and unmounts without changing the source page", () => {
    const source = document.createElement("main");
    source.textContent = "Original page";
    document.body.append(source);
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
    const readerCss = host?.shadowRoot?.querySelector("style")?.textContent ?? "";
    expect(readerCss).toContain("--re-outer-gap: clamp(20px, 3vw, 44px)");
    expect(readerCss).toContain(
      "min-height: calc(100vh - 2 * var(--re-outer-gap))",
    );
    expect(readerCss).toContain("border-radius: 3px");
    handle.unmount();
    expect(document.querySelector("[data-read-ease-host]")).toBeNull();
    expect(source.textContent).toBe("Original page");
  });
});
