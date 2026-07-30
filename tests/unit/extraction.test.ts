import { describe, expect, it } from "vitest";
import { createRule } from "../../src/domain/rules";
import { extractArticle } from "../../src/extraction/extract";
import { extractWithHeuristic } from "../../src/extraction/heuristic";
import { augmentArticleForSite } from "../../src/extraction/site-augment";
import type { Article } from "../../src/domain/article";

describe("article extraction", () => {
  it("uses a valid user rule before generic extraction", () => {
    document.body.innerHTML = `
      <article class="story">
        <h1>Example</h1>
        <p>${"Meaningful article paragraph. ".repeat(12)}</p>
        <p>${"A second paragraph with useful detail. ".repeat(8)}</p>
      </article>`;
    const userRule = createRule(
      new URL("https://example.com/post/1"),
      ".story",
    );
    const result = extractArticle(
      document,
      new URL("https://example.com/post/1"),
      { userRule },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("user-rule");
      expect(result.article.contentHtml).toContain("Meaningful article");
    }
  });

  it("falls back to a high-density semantic content container", () => {
    document.title = "Fallback article";
    document.body.innerHTML = `
      <header><a href="/one">One</a><a href="/two">Two</a></header>
      <div id="post-content">
        <div>${"这是缺少标准段落标签但仍然属于正文的内容。".repeat(35)}</div>
        <aside class="recommendations">推荐内容</aside>
      </div>`;
    const article = extractWithHeuristic(
      document,
      new URL("https://example.com/news/1"),
    );
    expect(article?.title).toBe("Fallback article");
    expect(article?.textContent).toContain("仍然属于正文");
    expect(article?.contentHtml).not.toContain("推荐内容");
  });

  it("adds Caixin media blocks that sit outside the text body", () => {
    document.body.innerHTML = `
      <div class="media article_media_pic">
        <dl class="media_pic">
          <dt><img data-src="https://img.caixin.com/photo_840_560.jpg"></dt>
          <dd>图片说明：财新记者拍摄</dd>
        </dl>
      </div>
      <div id="Main_Content_Val"><p>文章正文</p></div>`;
    const article: Article = {
      title: "财新文章",
      byline: null,
      publishedTime: null,
      siteName: "财新网",
      excerpt: null,
      leadImage: null,
      contentHtml: "<div><p>文章正文</p></div>",
      textContent: "文章正文",
      sourceUrl: "https://www.caixin.com/article.html",
      readingMinutes: 1,
    };
    const augmented = augmentArticleForSite(
      article,
      document,
      new URL("https://www.caixin.com/article.html"),
    );
    expect(augmented.contentHtml).toContain(
      'src="https://img.caixin.com/photo_840_560.jpg"',
    );
    expect(augmented.contentHtml).toContain("图片说明：财新记者拍摄");
    expect(augmented.contentHtml).toContain("文章正文");
  });
});
