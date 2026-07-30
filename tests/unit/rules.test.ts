import { describe, expect, it } from "vitest";
import {
  createRule,
  matchRule,
  validateRule,
  type SiteRule,
} from "../../src/domain/rules";

function rule(pathPattern: string): SiteRule {
  return {
    ...createRule(new URL("https://example.com"), "article", pathPattern),
    id: pathPattern,
  };
}

describe("site rules", () => {
  it("prefers the most specific path", () => {
    const broad = rule("/*");
    const article = rule("/article/*");
    expect(
      matchRule(new URL("https://example.com/article/42"), [broad, article]),
    ).toBe(article);
  });

  it("rejects body as the content selector", () => {
    const candidate = rule("/*");
    candidate.selectors.content = "body";
    expect(validateRule(candidate, document)).toMatchObject({ valid: false });
  });
});

