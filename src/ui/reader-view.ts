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
  closeImagePreview(): boolean;
  getScrollPosition(): number;
  restoreScrollPosition(position: number): void;
  unmount(options?: { immediate?: boolean }): void;
}

function textLine(values: Array<string | null | undefined>): string {
  return values.filter(Boolean).join(" · ");
}

interface ImageRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function imageTransitionTransform(
  source: ImageRect,
  destination: ImageRect,
): string {
  if (destination.width <= 0 || destination.height <= 0) return "none";
  const sourceCenterX = source.left + source.width / 2;
  const sourceCenterY = source.top + source.height / 2;
  const destinationCenterX = destination.left + destination.width / 2;
  const destinationCenterY = destination.top + destination.height / 2;
  return `translate(${sourceCenterX - destinationCenterX}px, ${
    sourceCenterY - destinationCenterY
  }px) scale(${source.width / destination.width}, ${
    source.height / destination.height
  })`;
}

function animateElement(
  element: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation | null {
  if (typeof element.animate !== "function") return null;
  return element.animate(keyframes, options);
}

function cancelElementAnimations(...elements: Element[]): void {
  elements.forEach((element) =>
    element.getAnimations?.().forEach((animation) => animation.cancel()),
  );
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

export function updateReadingProgress(
  overlay: HTMLElement,
  progress: HTMLElement,
): void {
  const viewportHeight = overlay.clientHeight;
  const scrollableHeight = overlay.scrollHeight - viewportHeight;
  const shouldShow =
    viewportHeight > 0 && overlay.scrollHeight > viewportHeight * 3;
  progress.hidden = !shouldShow;
  const value = shouldShow
    ? Math.min(1, Math.max(0, overlay.scrollTop / scrollableHeight))
    : 0;
  progress.style.transform = `scaleX(${value})`;
  progress.setAttribute("aria-valuenow", String(Math.round(value * 100)));
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
  const readingProgress = document.createElement("div");
  readingProgress.className = "reading-progress";
  readingProgress.hidden = true;
  readingProgress.setAttribute("role", "progressbar");
  readingProgress.setAttribute("aria-label", "阅读进度");
  readingProgress.setAttribute("aria-valuemin", "0");
  readingProgress.setAttribute("aria-valuemax", "100");
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

  const imagePreview = document.createElement("div");
  imagePreview.className = "image-preview";
  imagePreview.hidden = true;
  imagePreview.setAttribute("role", "dialog");
  imagePreview.setAttribute("aria-modal", "true");
  imagePreview.setAttribute("aria-label", "图片预览");
  const previewImage = document.createElement("img");
  previewImage.className = "image-preview-media";
  const previewTitle = document.createElement("div");
  previewTitle.className = "image-preview-title";
  previewTitle.textContent = article.title;
  previewTitle.title = article.title;
  const previewClose = document.createElement("button");
  previewClose.type = "button";
  previewClose.className = "image-preview-close";
  previewClose.setAttribute("aria-label", "关闭图片预览");
  previewClose.title = "关闭图片预览";
  const closeIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  closeIcon.setAttribute("viewBox", "0 0 20 20");
  closeIcon.setAttribute("aria-hidden", "true");
  const closeIconPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );
  closeIconPath.setAttribute("d", "M5.25 5.25 14.75 14.75M14.75 5.25 5.25 14.75");
  closeIconPath.setAttribute("fill", "none");
  closeIconPath.setAttribute("stroke", "currentColor");
  closeIconPath.setAttribute("stroke-width", "2.2");
  closeIconPath.setAttribute("stroke-linecap", "round");
  closeIcon.append(closeIconPath);
  previewClose.append(closeIcon);
  imagePreview.append(previewImage, previewTitle, previewClose);
  let previewSourceImage: HTMLImageElement | null = null;
  let previewAnimationSequence = 0;
  const prefersReducedMotion = (): boolean =>
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const finishClosingPreview = (source: HTMLImageElement | null): void => {
    imagePreview.hidden = true;
    delete imagePreview.dataset.transitionState;
    imagePreview.style.removeProperty("opacity");
    previewImage.style.removeProperty("opacity");
    previewImage.removeAttribute("src");
    previewImage.alt = "";
    if (source) source.style.removeProperty("visibility");
    previewSourceImage = null;
    cancelElementAnimations(
      imagePreview,
      previewImage,
      previewTitle,
      previewClose,
    );
  };
  const closeImagePreview = (): boolean => {
    if (imagePreview.hidden) return false;
    if (imagePreview.dataset.transitionState === "closing") return true;
    imagePreview.dataset.transitionState = "closing";
    const sequence = ++previewAnimationSequence;
    const source = previewSourceImage;
    cancelElementAnimations(
      imagePreview,
      previewImage,
      previewTitle,
      previewClose,
    );
    if (prefersReducedMotion() || typeof previewImage.animate !== "function") {
      finishClosingPreview(source);
      return true;
    }

    const sourceRect = source?.getBoundingClientRect();
    const previewRect = previewImage.getBoundingClientRect();
    const sourceIsVisible =
      source?.isConnected &&
      sourceRect &&
      sourceRect.width > 0 &&
      sourceRect.height > 0 &&
      sourceRect.bottom > 0 &&
      sourceRect.top < window.innerHeight &&
      sourceRect.right > 0 &&
      sourceRect.left < window.innerWidth;
    const imageEndTransform = sourceIsVisible
      ? imageTransitionTransform(sourceRect, previewRect)
      : "scale(.96)";
    const imageAnimation = animateElement(
      previewImage,
      [
        { opacity: 1, transform: "none" },
        { opacity: sourceIsVisible ? 0.72 : 0, transform: imageEndTransform },
      ],
      {
        duration: 240,
        easing: "cubic-bezier(.4, 0, 1, 1)",
        fill: "both",
      },
    );
    animateElement(
      imagePreview,
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 210, easing: "ease-in", fill: "both" },
    );
    animateElement(
      previewClose,
      [
        { opacity: 1, transform: "none" },
        { opacity: 0, transform: "translateY(-6px)" },
      ],
      { duration: 130, easing: "ease-in", fill: "both" },
    );
    animateElement(
      previewTitle,
      [
        { opacity: 1, transform: "translateX(-50%)" },
        { opacity: 0, transform: "translate(-50%, -4px)" },
      ],
      { duration: 130, easing: "ease-in", fill: "both" },
    );
    void imageAnimation?.finished
      .catch(() => undefined)
      .then(() => {
        if (sequence === previewAnimationSequence) {
          finishClosingPreview(source);
        }
      });
    return true;
  };
  content.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    image.addEventListener("load", () => updateWideImageLayout(content));
    image.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const sourceRect = image.getBoundingClientRect();
      cancelElementAnimations(
        imagePreview,
        previewImage,
        previewTitle,
        previewClose,
      );
      if (previewSourceImage && previewSourceImage !== image) {
        previewSourceImage.style.removeProperty("visibility");
      }
      previewSourceImage = image;
      const sequence = ++previewAnimationSequence;
      previewImage.src = image.currentSrc || image.src;
      previewImage.alt = image.alt;
      imagePreview.dataset.transitionState = "opening";
      imagePreview.style.opacity = "0";
      previewImage.style.opacity = "0";
      imagePreview.hidden = false;
      previewClose.focus();
      requestAnimationFrame(() => {
        if (sequence !== previewAnimationSequence || imagePreview.hidden) return;
        const destinationRect = previewImage.getBoundingClientRect();
        image.style.visibility = "hidden";
        imagePreview.style.opacity = "1";
        previewImage.style.opacity = "1";
        if (prefersReducedMotion()) {
          animateElement(
            imagePreview,
            [{ opacity: 0 }, { opacity: 1 }],
            { duration: 120, easing: "ease-out" },
          );
        } else {
          animateElement(
            imagePreview,
            [{ opacity: 0 }, { opacity: 1 }],
            { duration: 210, easing: "ease-out" },
          );
          animateElement(
            previewImage,
            [
              {
                opacity: 0.72,
                transform: imageTransitionTransform(sourceRect, destinationRect),
              },
              { opacity: 1, transform: "none" },
            ],
            {
              duration: 320,
              easing: "cubic-bezier(.22, 1, .36, 1)",
            },
          );
          animateElement(
            previewClose,
            [
              { opacity: 0, transform: "translateY(-7px)" },
              { opacity: 1, transform: "none" },
            ],
            {
              duration: 180,
              delay: 100,
              easing: "cubic-bezier(.22, 1, .36, 1)",
              fill: "backwards",
            },
          );
          animateElement(
            previewTitle,
            [
              { opacity: 0, transform: "translate(-50%, -5px)" },
              { opacity: 1, transform: "translateX(-50%)" },
            ],
            {
              duration: 200,
              delay: 80,
              easing: "cubic-bezier(.22, 1, .36, 1)",
              fill: "backwards",
            },
          );
        }
        imagePreview.dataset.transitionState = "open";
      });
    });
  });
  imagePreview.addEventListener("click", (event) => {
    if (event.target === imagePreview) closeImagePreview();
  });
  previewClose.addEventListener("click", closeImagePreview);
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
  overlay.append(
    readingProgress,
    pill,
    popover.element,
    articleElement,
    imagePreview,
  );
  shadow.append(style, overlay);
  document.documentElement.append(host);
  void overlay.offsetWidth;
  const enterAnimationFrame = requestAnimationFrame(() => {
    overlay.dataset.transitionState = "visible";
  });
  updateWideImageLayout(content);
  const refreshReadingProgress = (): void =>
    updateReadingProgress(overlay, readingProgress);
  overlay.addEventListener("scroll", refreshReadingProgress, { passive: true });
  refreshReadingProgress();
  const resizeObserver = new ResizeObserver(() => {
    updateWideImageLayout(content);
    refreshReadingProgress();
  });
  resizeObserver.observe(content);
  resizeObserver.observe(overlay);

  let removed = false;
  let removalTimer: ReturnType<typeof setTimeout> | undefined;
  const removeHost = (): void => {
    if (removed) return;
    removed = true;
    if (removalTimer !== undefined) clearTimeout(removalTimer);
    overlay.removeEventListener("transitionend", onTransitionEnd);
    overlay.removeEventListener("scroll", refreshReadingProgress);
    resizeObserver.disconnect();
    host.remove();
  };
  const onTransitionEnd = (event: TransitionEvent): void => {
    if (
      overlay.dataset.transitionState === "exiting" &&
      event.target === overlay &&
      event.propertyName === "background-color"
    ) {
      removeHost();
    }
  };
  overlay.addEventListener("transitionend", onTransitionEnd);

  return {
    updateSettings(next) {
      applySettings(next);
      popover.update(next);
    },
    closePopover() {
      popover.element.hidden = true;
    },
    closeImagePreview,
    getScrollPosition() {
      return overlay.scrollTop;
    },
    restoreScrollPosition(position) {
      const requested = Math.max(0, Number.isFinite(position) ? position : 0);
      const maxScroll = Math.max(0, overlay.scrollHeight - overlay.clientHeight);
      overlay.scrollTop = maxScroll > 0 ? Math.min(requested, maxScroll) : requested;
      refreshReadingProgress();
    },
    unmount(options) {
      cancelAnimationFrame(enterAnimationFrame);
      if (options?.immediate) {
        removeHost();
        return;
      }
      overlay.dataset.transitionState = "exiting";
      const reducedMotion =
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      removalTimer = setTimeout(removeHost, reducedMotion ? 100 : 220);
    },
  };
}
