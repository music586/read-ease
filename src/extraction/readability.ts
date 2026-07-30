import { Readability } from "@mozilla/readability";
import { readingMinutes, type Article } from "../domain/article";

export function extractWithReadability(
  sourceDocument: Document,
  url: URL,
): Article | null {
  const document = sourceDocument.cloneNode(true) as Document;
  const parsed = new Readability(document, {
    charThreshold: 200,
    keepClasses: false,
  }).parse();
  if (!parsed?.content || !parsed.textContent) return null;
  return {
    title: parsed.title || sourceDocument.title || url.hostname,
    byline: parsed.byline || null,
    publishedTime:
      sourceDocument
        .querySelector('meta[property="article:published_time"]')
        ?.getAttribute("content") ?? null,
    siteName: parsed.siteName || url.hostname,
    excerpt: parsed.excerpt || null,
    leadImage:
      sourceDocument
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content") ?? null,
    contentHtml: parsed.content,
    textContent: parsed.textContent,
    sourceUrl: url.toString(),
    readingMinutes: readingMinutes(parsed.textContent),
  };
}

