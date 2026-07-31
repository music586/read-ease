import type { Article } from "../domain/article";
import type { ReaderSettings } from "../domain/settings";
import {
  articleToMarkdown,
  copyTextToClipboard,
} from "../markdown/article-markdown";
import {
  createAppearancePopover,
  type SettingsScope,
} from "./appearance-popover";
import { READER_CSS, settingsVariables } from "./reader-styles";

export interface ReaderCallbacks {
  onExit(): void;
  onSettingsChange(settings: ReaderSettings, scope: SettingsScope): void;
  onResetSettings(scope: SettingsScope): void;
  onEditRule(): void;
  onAutoEnterChange(enabled: boolean): void;
  autoEnter: boolean;
}

export interface ReaderViewHandle {
  updateSettings(settings: ReaderSettings): void;
  closePopover(): void;
  unmount(): void;
}

function textLine(values: Array<string | null | undefined>): string {
  return values.filter(Boolean).join(" · ");
}

export function updateWideImageLayout(content: HTMLElement): void {
  const contentWidth = content.clientWidth;
  if (contentWidth <= 0) return;
  content.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    const sourceWidth = image.naturalWidth || Number(image.getAttribute("width"));
    image.toggleAttribute(
      "data-read-ease-wide",
      sourceWidth >= contentWidth * 0.8,
    );
  });
}

const PROSE_BLOCK_ELEMENTS =
  "section, article, aside, p, blockquote, ul, ol, li, table, figure, pre, h1, h2, h3, h4, h5, h6";
const MEDIA_ELEMENTS = "img, picture, figure, video, audio, table, iframe";

export function normalizeProseBlocks(content: HTMLElement): void {
  const sections = [...content.querySelectorAll<HTMLElement>("section")];
  for (const section of sections) {
    const belongsToNestedLayout = section.parentElement?.closest("section");
    const hasBlockChild = [...section.children].some((child) =>
      child.matches(PROSE_BLOCK_ELEMENTS),
    );
    const hasMediaChild = [...section.children].some((child) =>
      child.matches(MEDIA_ELEMENTS),
    );
    if (
      belongsToNestedLayout ||
      hasBlockChild ||
      hasMediaChild ||
      !(section.textContent?.trim().length ?? 0)
    ) {
      continue;
    }

    const paragraph = content.ownerDocument.createElement("p");
    for (const attribute of [...section.attributes]) {
      paragraph.setAttribute(attribute.name, attribute.value);
    }
    paragraph.append(...section.childNodes);
    section.replaceWith(paragraph);
  }
}

function adjacentContentNode(
  node: Node,
  direction: "previousSibling" | "nextSibling",
): Node | null {
  let sibling = node[direction];
  while (sibling?.nodeType === Node.TEXT_NODE && !sibling.textContent?.trim()) {
    sibling = sibling[direction];
  }
  return sibling;
}

export function normalizeProseLineBreaks(content: HTMLElement): void {
  content.querySelectorAll<HTMLElement>("p, blockquote, li").forEach((block) => {
    if ((block.textContent?.trim().length ?? 0) < 40) return;
    [...block.querySelectorAll("br")].forEach((lineBreak) => {
      const previous = adjacentContentNode(lineBreak, "previousSibling");
      const next = adjacentContentNode(lineBreak, "nextSibling");
      const belongsToBlankLine =
        previous instanceof HTMLBRElement || next instanceof HTMLBRElement;
      if (belongsToBlankLine) return;

      const previousCharacter = previous?.textContent?.trim().slice(-1) ?? "";
      const nextCharacter = next?.textContent?.trim().slice(0, 1) ?? "";
      const needsWordSeparator =
        /[a-z0-9]/i.test(previousCharacter) && /[a-z0-9]/i.test(nextCharacter);

      while (
        lineBreak.previousSibling?.nodeType === Node.TEXT_NODE &&
        !lineBreak.previousSibling.textContent?.trim()
      ) {
        lineBreak.previousSibling.remove();
      }
      while (
        lineBreak.nextSibling?.nodeType === Node.TEXT_NODE &&
        !lineBreak.nextSibling.textContent?.trim()
      ) {
        lineBreak.nextSibling.remove();
      }
      lineBreak.replaceWith(
        document.createTextNode(needsWordSeparator ? " " : ""),
      );
    });

    const textNodes: Text[] = [];
    const needsSemanticSpace = (left: string, right: string): boolean =>
      /[A-Za-z0-9,.;:!?)]/u.test(left) && /[A-Za-z0-9(]/u.test(right);
    const collectTextNodes = (node: Node): void => {
      if (
        node instanceof HTMLElement &&
        node.matches("code, pre")
      ) {
        return;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        const textNode = node as Text;
        textNode.textContent =
          textNode.textContent?.replace(
            /(\S)\s+(?=(\S))/gu,
            (_match, left: string, right: string) =>
              `${left}${needsSemanticSpace(left, right) ? " " : ""}`,
          ) ?? "";
        textNodes.push(textNode);
        return;
      }
      [...node.childNodes].forEach(collectTextNodes);
    };
    collectTextNodes(block);

    const meaningfulText = (index: number, step: -1 | 1): string => {
      for (let cursor = index + step; textNodes[cursor]; cursor += step) {
        const value = textNodes[cursor]?.textContent?.trim();
        if (value) return value;
      }
      return "";
    };

    textNodes.forEach((textNode, index) => {
      const previous = meaningfulText(index, -1).slice(-1);
      const next = meaningfulText(index, 1).slice(0, 1);
      let value = textNode.textContent ?? "";
      if (!value.trim()) {
        if (previous && next && !needsSemanticSpace(previous, next)) value = "";
      } else {
        if (
          previous &&
          !needsSemanticSpace(previous, value.trimStart()[0] ?? "")
        ) {
          value = value.trimStart();
        }
        if (
          next &&
          !needsSemanticSpace(value.trimEnd().slice(-1), next)
        ) {
          value = value.trimEnd();
        }
      }
      textNode.textContent = value;
    });
  });
}

export function mountReaderView(
  article: Article,
  contentHtml: string,
  settings: ReaderSettings,
  callbacks: ReaderCallbacks,
): ReaderViewHandle {
  const existing = document.querySelector("[data-read-ease-host]");
  existing?.remove();

  const host = document.createElement("div");
  host.dataset.readEaseHost = "";
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = READER_CSS;
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  const pageFontFamily =
    getComputedStyle(document.body).fontFamily || "ui-sans-serif, system-ui, sans-serif";
  const applySettings = (next: ReaderSettings): void => {
    overlay.setAttribute("style", settingsVariables(next));
    overlay.style.setProperty("--re-page-font-family", pageFontFamily);
  };
  applySettings(settings);

  const pill = document.createElement("div");
  pill.className = "pill";
  const appearanceButton = document.createElement("button");
  appearanceButton.type = "button";
  appearanceButton.dataset.action = "appearance";
  appearanceButton.textContent = "Aa";
  appearanceButton.title = "阅读外观";
  const exitButton = document.createElement("button");
  exitButton.type = "button";
  exitButton.dataset.action = "exit";
  exitButton.textContent = "×";
  exitButton.title = "退出阅读模式";
  pill.append(appearanceButton, exitButton);

  const articleElement = document.createElement("article");
  articleElement.className = "article";
  const source = document.createElement("div");
  source.className = "source";
  source.textContent = article.siteName ?? new URL(article.sourceUrl).hostname;
  const title = document.createElement("h1");
  title.className = "title";
  title.textContent = article.title;
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = textLine([
    article.byline,
    article.publishedTime,
    `${article.readingMinutes} 分钟阅读`,
  ]);
  const content = document.createElement("div");
  content.className = "content";
  content.lang = "zh-CN";
  content.innerHTML = contentHtml;
  normalizeProseBlocks(content);
  normalizeProseLineBreaks(content);
  content.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    image.addEventListener("load", () => updateWideImageLayout(content));
  });
  articleElement.append(source, title, meta, content);

  const popover = createAppearancePopover(settings, {
    onChange: callbacks.onSettingsChange,
    onReset: callbacks.onResetSettings,
    onEditRule: callbacks.onEditRule,
    onAutoEnterChange: callbacks.onAutoEnterChange,
    onCopyMarkdown: () =>
      copyTextToClipboard(articleToMarkdown(article, contentHtml)),
  }, callbacks.autoEnter);
  appearanceButton.addEventListener("click", (event) => {
    event.stopPropagation();
    popover.element.toggleAttribute("hidden");
  });
  exitButton.addEventListener("click", callbacks.onExit);
  overlay.addEventListener("click", (event) => {
    if (
      !popover.element.hidden &&
      !event.composedPath().includes(popover.element) &&
      !event.composedPath().includes(appearanceButton)
    ) {
      popover.element.hidden = true;
    }
  });
  overlay.append(pill, popover.element, articleElement);
  shadow.append(style, overlay);
  document.documentElement.append(host);
  updateWideImageLayout(content);
  const resizeObserver = new ResizeObserver(() => {
    updateWideImageLayout(content);
  });
  resizeObserver.observe(content);

  return {
    updateSettings(next) {
      applySettings(next);
      popover.update(next);
    },
    closePopover() {
      popover.element.hidden = true;
    },
    unmount() {
      resizeObserver.disconnect();
      host.remove();
    },
  };
}
