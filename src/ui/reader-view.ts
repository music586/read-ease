import type { Article } from "../domain/article";
import type { ReaderSettings } from "../domain/settings";
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
  content.innerHTML = contentHtml;
  articleElement.append(source, title, meta, content);

  const popover = createAppearancePopover(settings, {
    onChange: callbacks.onSettingsChange,
    onReset: callbacks.onResetSettings,
    onEditRule: callbacks.onEditRule,
    onAutoEnterChange: callbacks.onAutoEnterChange,
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

  return {
    updateSettings(next) {
      applySettings(next);
      popover.update(next);
    },
    closePopover() {
      popover.element.hidden = true;
    },
    unmount() {
      host.remove();
    },
  };
}
