import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import type { Article } from "../domain/article";

function escapeInline(value: string): string {
  return value.replace(/([\\`*_[\]<>#+|])/g, "\\$1");
}

export function articleToMarkdown(
  article: Article,
  sanitizedContentHtml: string,
): string {
  const turndown = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    fence: "```",
    emDelimiter: "*",
    strongDelimiter: "**",
  });
  turndown.use(gfm);
  turndown.addRule("removeEmptyLinks", {
    filter: (node) =>
      node.nodeName === "A" && !(node.textContent?.trim() || ""),
    replacement: () => "",
  });

  const metadata: string[] = [];
  if (article.byline) metadata.push(`作者：${escapeInline(article.byline)}`);
  if (article.publishedTime) {
    metadata.push(`发布时间：${escapeInline(article.publishedTime)}`);
  }
  metadata.push(`原文：[${escapeInline(article.siteName ?? new URL(article.sourceUrl).hostname)}](${article.sourceUrl})`);

  const body = turndown
    .turndown(sanitizedContentHtml)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return [
    `# ${escapeInline(article.title)}`,
    metadata.map((line) => `> ${line}`).join("\n>\n"),
    "---",
    body,
  ]
    .filter(Boolean)
    .join("\n\n")
    .concat("\n");
}

export async function copyTextToClipboard(
  text: string,
  navigatorObject: Navigator = navigator,
  documentObject: Document = document,
): Promise<boolean> {
  try {
    if (navigatorObject.clipboard?.writeText) {
      await navigatorObject.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Continue to the selection-based fallback.
  }

  const textarea = documentObject.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  Object.assign(textarea.style, {
    position: "fixed",
    left: "-9999px",
    opacity: "0",
  });
  documentObject.body.append(textarea);
  textarea.select();
  const copied = documentObject.execCommand?.("copy") ?? false;
  textarea.remove();
  return copied;
}

