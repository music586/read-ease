import { describe, expect, it } from "vitest";
import { createRule } from "../../src/domain/rules";
import { extractArticle } from "../../src/extraction/extract";
import { extractWithHeuristic } from "../../src/extraction/heuristic";

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
});
