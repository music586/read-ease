import { describe, expect, it, vi } from "vitest";
import type { Article } from "../../src/domain/article";
import {
  articleToMarkdown,
  copyTextToClipboard,
} from "../../src/markdown/article-markdown";

const article: Article = {
  title: "测试文章",
  byline: "作者甲",
  publishedTime: "2026-08-01",
  siteName: "示例网站",
  excerpt: null,
  leadImage: null,
  contentHtml: "",
  textContent: "正文",
  sourceUrl: "https://example.com/article",
  readingMinutes: 1,
};

describe("article Markdown", () => {
  it("converts article metadata and semantic HTML to GFM", () => {
    const markdown = articleToMarkdown(
      article,
      `<h2>章节</h2><p>带有 <a href="https://example.com/link">链接</a>。</p>
       <img src="https://example.com/image.jpg" alt="图片">
       <table><thead><tr><th>项目</th><th>值</th></tr></thead>
       <tbody><tr><td>A</td><td>1</td></tr></tbody></table>`,
    );
    expect(markdown).toContain("# 测试文章");
    expect(markdown).toContain("> 作者：作者甲");
    expect(markdown).toContain("[示例网站](https://example.com/article)");
    expect(markdown).toContain("## 章节");
    expect(markdown).toContain("[链接](https://example.com/link)");
    expect(markdown).toContain("![图片](https://example.com/image.jpg)");
    expect(markdown).toContain("| 项目 | 值 |");
  });

  it("copies generated text through the Clipboard API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const navigatorObject = { clipboard: { writeText } } as unknown as Navigator;
    await expect(
      copyTextToClipboard("# Markdown", navigatorObject, document),
    ).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("# Markdown");
  });
});

