import createDOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "a",
  "article",
  "aside",
  "blockquote",
  "br",
  "caption",
  "code",
  "div",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "li",
  "ol",
  "p",
  "picture",
  "pre",
  "section",
  "source",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
];

function safeAbsoluteUrl(value: string, baseUrl: URL): string | null {
  try {
    const url = new URL(value, baseUrl);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function sanitizeArticleHtml(
  html: string,
  baseUrl: URL,
  windowObject: Window = window,
): string {
  const purifier = createDOMPurify(
    windowObject as unknown as Parameters<typeof createDOMPurify>[0],
  );
  const clean = purifier.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [
      "alt",
      "cite",
      "colspan",
      "datetime",
      "height",
      "href",
      "rowspan",
      "src",
      "srcset",
      "title",
      "width",
    ],
    FORBID_TAGS: ["form", "iframe", "script", "style", "template"],
  });

  const template = windowObject.document.createElement("template");
  template.innerHTML = clean;
  template.content.querySelectorAll<HTMLElement>("*").forEach((element) => {
    for (const attribute of [...element.attributes]) {
      if (attribute.name.startsWith("on")) element.removeAttribute(attribute.name);
    }
  });
  template.content.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
    const value = safeAbsoluteUrl(link.getAttribute("href") ?? "", baseUrl);
    if (value) {
      link.href = value;
      link.rel = "noopener noreferrer";
    } else {
      link.removeAttribute("href");
    }
  });
  template.content
    .querySelectorAll<HTMLImageElement>("img[src], source[src]")
    .forEach((image) => {
      const value = safeAbsoluteUrl(image.getAttribute("src") ?? "", baseUrl);
      if (value) image.setAttribute("src", value);
      else image.removeAttribute("src");
    });
  template.content.querySelectorAll<HTMLElement>("[srcset]").forEach((element) => {
    const resolved = (element.getAttribute("srcset") ?? "")
      .split(",")
      .map((entry) => {
        const [rawUrl, descriptor] = entry.trim().split(/\s+/, 2);
        const url = rawUrl ? safeAbsoluteUrl(rawUrl, baseUrl) : null;
        return url ? `${url}${descriptor ? ` ${descriptor}` : ""}` : "";
      })
      .filter(Boolean)
      .join(", ");
    if (resolved) element.setAttribute("srcset", resolved);
    else element.removeAttribute("srcset");
  });
  return template.innerHTML;
}
