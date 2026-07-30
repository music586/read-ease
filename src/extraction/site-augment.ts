import type { Article } from "../domain/article";

function isCaixin(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  return hostname === "caixin.com" || hostname.endsWith(".caixin.com");
}

function imageUrl(image: HTMLImageElement): string | null {
  return (
    image.getAttribute("src") ||
    image.getAttribute("data-src") ||
    image.getAttribute("data-original") ||
    image.getAttribute("data-lazy-src")
  );
}

function caixinMediaFigures(
  sourceDocument: Document,
  articleHtml: string,
): { html: string; firstImage: string | null } {
  const figures: string[] = [];
  let firstImage: string | null = null;
  sourceDocument
    .querySelectorAll<HTMLElement>(".media.article_media_pic")
    .forEach((media) => {
      const sourceImage = media.querySelector<HTMLImageElement>("img");
      const src = sourceImage ? imageUrl(sourceImage) : null;
      if (!src || articleHtml.includes(src)) return;
      firstImage ??= src;

      const figure = sourceDocument.createElement("figure");
      figure.dataset.readEaseSource = "caixin-media";
      const image = sourceDocument.createElement("img");
      image.setAttribute("src", src);
      const alt =
        sourceImage?.getAttribute("alt") ||
        media.querySelector("dd, figcaption")?.textContent?.trim() ||
        "";
      if (alt) image.setAttribute("alt", alt);
      figure.append(image);

      const captionText =
        media.querySelector("dd, figcaption")?.textContent?.trim() ?? "";
      if (captionText) {
        const caption = sourceDocument.createElement("figcaption");
        caption.textContent = captionText;
        figure.append(caption);
      }
      figures.push(figure.outerHTML);
    });
  return { html: figures.join("\n"), firstImage };
}

export function augmentArticleForSite(
  article: Article,
  sourceDocument: Document,
  url: URL,
): Article {
  if (!isCaixin(url)) return article;
  const media = caixinMediaFigures(sourceDocument, article.contentHtml);
  if (!media.html) return article;
  return {
    ...article,
    leadImage: article.leadImage ?? media.firstImage,
    contentHtml: `${media.html}\n${article.contentHtml}`,
  };
}

