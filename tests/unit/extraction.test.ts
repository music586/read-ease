import { describe, expect, it } from "vitest";
import { createRule } from "../../src/domain/rules";
import { extractArticle } from "../../src/extraction/extract";

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
});

