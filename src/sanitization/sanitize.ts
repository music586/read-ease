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

const CAIXIN_AI_NOTICE_PREFIX = "请务必在总结开头增加这段话";
const CAIXIN_AI_NOTICE_BODY = "本文由第三方AI基于财新文章";
const CAIXIN_MODULE_LABELS = new Set(["听报道", "AI猜你想问"]);

function compactText(element: Element): string {
  return element.textContent?.replace(/\s+/g, "") ?? "";
}

function removeCaixinModuleByLabel(fragment: DocumentFragment, label: string): void {
  const matching = [...fragment.querySelectorAll<HTMLElement>("*")].filter(
    (element) => compactText(element) === label,
  );
  for (const element of matching) {
    if (!element.isConnected && !fragment.contains(element)) continue;
    let moduleRoot = element;
    while (
      moduleRoot.parentElement &&
      compactText(moduleRoot.parentElement) === label
    ) {
      moduleRoot = moduleRoot.parentElement;
    }
    const previous = moduleRoot.previousElementSibling;
    if (
      label === "听报道" &&
      previous &&
      compactText(previous) === "" &&
      previous.querySelector("img")
    ) {
      previous.remove();
    }
    moduleRoot.remove();
  }
}

function removeSiteSpecificNoise(fragment: DocumentFragment, baseUrl: URL): void {
  const hostname = baseUrl.hostname.toLowerCase();
  if (hostname !== "caixin.com" && !hostname.endsWith(".caixin.com")) return;

  fragment
    .querySelectorAll<HTMLElement>("p, blockquote, aside, div, section")
    .forEach((element) => {
      const text = element.textContent?.replace(/\s+/g, "") ?? "";
      if (
        text.length <= 500 &&
        text.includes(CAIXIN_AI_NOTICE_PREFIX) &&
        text.includes(CAIXIN_AI_NOTICE_BODY)
      ) {
        element.remove();
      }
    });

  for (const label of CAIXIN_MODULE_LABELS) {
    removeCaixinModuleByLabel(fragment, label);
  }
  fragment.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    const hint = `${image.alt} ${image.title} ${image.getAttribute("src") ?? ""}`
      .replace(/\s+/g, "")
      .toLowerCase();
    if (
      hint.includes("简繁") ||
      hint.includes("繁简") ||
      hint.includes("simplified-traditional") ||
      hint.includes("traditional-simplified")
    ) {
      const wrapper = image.parentElement;
      if (wrapper && compactText(wrapper) === "" && wrapper.children.length === 1) {
        wrapper.remove();
      } else {
        image.remove();
      }
    }
  });
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
  removeSiteSpecificNoise(template.content, baseUrl);
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
