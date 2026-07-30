import { readingMinutes, type Article } from "../domain/article";
import type { SiteRule } from "../domain/rules";

function textAt(document: Document, selector?: string): string | null {
  if (!selector) return null;
  return document.querySelector(selector)?.textContent?.trim() || null;
}

function attributeAt(
  document: Document,
  selector: string | undefined,
  attribute: string,
): string | null {
  if (!selector) return null;
  return document.querySelector(selector)?.getAttribute(attribute) || null;
}

export function extractWithRule(
  sourceDocument: Document,
  url: URL,
  rule: SiteRule,
): Article | null {
  const document = sourceDocument.cloneNode(true) as Document;
  try {
    for (const selector of rule.excludedSelectors) {
      document.querySelectorAll(selector).forEach((element) => element.remove());
    }
    const nodes = [...document.querySelectorAll(rule.selectors.content)];
    if (!nodes.length) return null;
    const contentHtml = nodes.map((node) => node.outerHTML).join("\n");
    const textContent = nodes
      .map((node) => node.textContent?.trim() ?? "")
      .join("\n");
    const leadImageRaw =
      attributeAt(document, rule.selectors.leadImage, "src") ??
      nodes[0]?.querySelector("img")?.getAttribute("src") ??
      null;
    return {
      title:
        textAt(document, rule.selectors.title) ||
        sourceDocument.title ||
        url.hostname,
      byline: textAt(document, rule.selectors.author),
      publishedTime: textAt(document, rule.selectors.date),
      siteName: url.hostname,
      excerpt: null,
      leadImage: leadImageRaw
        ? new URL(leadImageRaw, url).toString()
        : null,
      contentHtml,
      textContent,
      sourceUrl: url.toString(),
      readingMinutes: readingMinutes(textContent),
    };
  } catch {
    return null;
  }
}

