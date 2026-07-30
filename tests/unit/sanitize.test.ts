import { describe, expect, it } from "vitest";
import { sanitizeArticleHtml } from "../../src/sanitization/sanitize";

describe("article sanitizer", () => {
  it("removes executable markup and resolves relative assets", () => {
    const clean = sanitizeArticleHtml(
      '<p onclick="steal()">Text</p><script>steal()</script><img src="/hero.jpg">',
      new URL("https://example.com/a/"),
    );
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("onclick");
    expect(clean).toContain('src="https://example.com/hero.jpg"');
  });
});

