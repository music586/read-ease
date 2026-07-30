import type {
  ExtractionResult,
  ExtractionSource,
  ExtractionWarning,
} from "../domain/article";
import type { SiteRule } from "../domain/rules";
import { articleQuality } from "./quality";
import { extractWithHeuristic } from "./heuristic";
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

  const readabilityArticle = extractWithReadability(document, url);
  if (
    readabilityArticle &&
    articleQuality(
      readabilityArticle.textContent,
      readabilityArticle.contentHtml,
    ).pass
  ) {
    return {
      ok: true,
      article: readabilityArticle,
      source: "readability",
      warnings,
    };
  }
  if (readabilityArticle) {
    warnings.push({
      source: "readability",
      message: "Readability 提取结果未达到正文质量要求",
    });
  }

  const heuristicArticle = extractWithHeuristic(document, url);
  if (
    heuristicArticle &&
    articleQuality(heuristicArticle.textContent, heuristicArticle.contentHtml)
      .pass
  ) {
    return {
      ok: true,
      article: heuristicArticle,
      source: "heuristic",
      warnings,
    };
  }
  return {
    ok: false,
    error: readabilityArticle || heuristicArticle ? "LOW_QUALITY" : "NO_ARTICLE",
    warnings,
  };
}
