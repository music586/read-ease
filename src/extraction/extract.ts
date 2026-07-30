import type {
  ExtractionResult,
  ExtractionSource,
  ExtractionWarning,
} from "../domain/article";
import type { SiteRule } from "../domain/rules";
import { articleQuality } from "./quality";
import { extractWithReadability } from "./readability";
import { extractWithRule } from "./rule-extractor";

export interface ExtractionOptions {
  temporaryRule?: SiteRule;
  userRule?: SiteRule;
  builtinRule?: SiteRule;
}

export function extractArticle(
  document: Document,
  url: URL,
  options: ExtractionOptions = {},
): ExtractionResult {
  const warnings: ExtractionWarning[] = [];
  const candidates: Array<[ExtractionSource, SiteRule | undefined]> = [
    ["temporary-rule", options.temporaryRule],
    ["user-rule", options.userRule],
    ["builtin-rule", options.builtinRule],
  ];

  for (const [source, rule] of candidates) {
    if (!rule) continue;
    const article = extractWithRule(document, url, rule);
    if (article && articleQuality(article.textContent, article.contentHtml).pass) {
      return { ok: true, article, source, warnings };
    }
    warnings.push({ source, message: "规则未能提取到足够的正文内容" });
  }

  const article = extractWithReadability(document, url);
  if (article && articleQuality(article.textContent, article.contentHtml).pass) {
    return { ok: true, article, source: "readability", warnings };
  }
  return {
    ok: false,
    error: article ? "LOW_QUALITY" : "NO_ARTICLE",
    warnings,
  };
}

