import { readingMinutes, type Article } from "../domain/article";

const CANDIDATE_SELECTORS = [
  "article",
  "main",
  '[role="main"]',
  "#article",
  "#content",
  "#main-content",
  "#post-content",
  '[class*="article-content"]',
  '[class*="article_body"]',
  '[class*="article-body"]',
  '[class*="post-content"]',
  '[class*="entry-content"]',
  '[class*="story-body"]',
  '[class*="main-content"]',
];

const NOISE_SELECTORS = [
  "nav",
  "footer",
  "aside",
  "form",
  "button",
  '[role="navigation"]',
  '[aria-hidden="true"]',
  '[class*="comment"]',
  '[class*="recommend"]',
  '[class*="related"]',
  '[class*="share"]',
  '[class*="advert"]',
];

function candidateScore(element: Element): number {
  const text = element.textContent?.replace(/\s+/g, " ").trim() ?? "";
  if (text.length < 200) return Number.NEGATIVE_INFINITY;
  const linkText = [...element.querySelectorAll("a")].reduce(
    (sum, link) => sum + (link.textContent?.trim().length ?? 0),
    0,
  );
  const linkDensity = linkText / Math.max(text.length, 1);
  if (linkDensity > 0.45) return Number.NEGATIVE_INFINITY;
  const paragraphs = element.querySelectorAll("p").length;
  const headings = element.querySelectorAll("h1, h2, h3").length;
  const images = element.querySelectorAll("img").length;
  return (
    text.length * (1 - linkDensity) +
    paragraphs * 100 +
    headings * 30 +
    images * 25
  );
}

function metadata(
  document: Document,
  selector: string,
  attribute = "content",
): string | null {
  return document.querySelector(selector)?.getAttribute(attribute) ?? null;
}

export function extractWithHeuristic(
  sourceDocument: Document,
  url: URL,
): Article | null {
  const candidates = [
    ...new Set(
      CANDIDATE_SELECTORS.flatMap((selector) => [
        ...sourceDocument.querySelectorAll(selector),
      ]),
    ),
  ];
  const best = candidates
    .map((element) => ({ element, score: candidateScore(element) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => b.score - a.score)[0]?.element;
  if (!best) return null;

  const content = best.cloneNode(true) as Element;
  for (const selector of NOISE_SELECTORS) {
    content.querySelectorAll(selector).forEach((element) => element.remove());
  }
  const textContent = content.textContent?.replace(/\s+/g, " ").trim() ?? "";
  if (textContent.length < 200) return null;

  const title =
    sourceDocument.querySelector("h1")?.textContent?.trim() ||
    metadata(sourceDocument, 'meta[property="og:title"]') ||
    sourceDocument.title ||
    url.hostname;
  const byline =
    metadata(sourceDocument, 'meta[name="author"]') ||
    sourceDocument
      .querySelector('[rel="author"], [class*="author"], [class*="byline"]')
      ?.textContent?.trim() ||
    null;
  return {
    title,
    byline,
    publishedTime:
      metadata(sourceDocument, 'meta[property="article:published_time"]') ||
      sourceDocument.querySelector("time")?.getAttribute("datetime") ||
      null,
    siteName:
      metadata(sourceDocument, 'meta[property="og:site_name"]') || url.hostname,
    excerpt: metadata(sourceDocument, 'meta[name="description"]'),
    leadImage: metadata(sourceDocument, 'meta[property="og:image"]'),
    contentHtml: content.outerHTML,
    textContent,
    sourceUrl: url.toString(),
    readingMinutes: readingMinutes(textContent),
  };
}

