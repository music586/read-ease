import type { SiteSettingsOverride } from "./settings";

export interface RuleSelectors {
  content: string;
  title?: string;
  author?: string;
  date?: string;
  leadImage?: string;
}

export interface SiteRule {
  id: string;
  host: string;
  pathPattern: string;
  selectors: RuleSelectors;
  excludedSelectors: string[];
  autoEnter: boolean;
  settings: SiteSettingsOverride;
  source: "user" | "builtin";
  updatedAt: number;
}

export interface RuleValidation {
  valid: boolean;
  message?: string;
}

function patternRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

export function matchRules(url: URL, rules: SiteRule[]): SiteRule[] {
  return rules
    .filter(
      (rule) =>
        rule.host === url.hostname &&
        patternRegex(rule.pathPattern).test(url.pathname),
    )
    .sort((a, b) => {
      if (a.source !== b.source) return a.source === "user" ? -1 : 1;
      return b.pathPattern.replace(/\*/g, "").length -
        a.pathPattern.replace(/\*/g, "").length;
    });
}

export function matchRule(url: URL, rules: SiteRule[]): SiteRule | undefined {
  return matchRules(url, rules)[0];
}

export function validateRule(
  rule: SiteRule,
  document: Document,
): RuleValidation {
  const selector = rule.selectors.content.trim();
  if (!selector) return { valid: false, message: "正文选择器不能为空" };
  if (["html", "body", ":root"].includes(selector.toLowerCase())) {
    return { valid: false, message: "正文区域范围过大" };
  }
  try {
    const matches = [...document.querySelectorAll(selector)];
    if (matches.length === 0) {
      return { valid: false, message: "正文选择器没有匹配元素" };
    }
    const length = matches.reduce(
      (sum, element) => sum + (element.textContent?.trim().length ?? 0),
      0,
    );
    if (length < 200) {
      return { valid: false, message: "匹配内容过短，可能不是正文" };
    }
    for (const candidate of [
      rule.selectors.title,
      rule.selectors.author,
      rule.selectors.date,
      rule.selectors.leadImage,
      ...rule.excludedSelectors,
    ]) {
      if (candidate) document.querySelector(candidate);
    }
  } catch {
    return { valid: false, message: "CSS Selector 无效" };
  }
  return { valid: true };
}

export function createRule(
  url: URL,
  contentSelector: string,
  pathPattern = "/*",
): SiteRule {
  return {
    id: crypto.randomUUID(),
    host: url.hostname,
    pathPattern,
    selectors: { content: contentSelector },
    excludedSelectors: [],
    autoEnter: false,
    settings: {},
    source: "user",
    updatedAt: Date.now(),
  };
}

