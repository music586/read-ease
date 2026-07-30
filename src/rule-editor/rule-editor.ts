import { createRule, validateRule, type SiteRule } from "../domain/rules";
import { RuleStore } from "../storage/rule-store";
import { SelectionMode } from "./selection-mode";

export class RuleEditor {
  constructor(
    private readonly selection = new SelectionMode(),
    private readonly store = new RuleStore(),
  ) {}

  async selectContent(url: URL): Promise<SiteRule | null> {
    const selected = await this.selection.pickOne("点击文章正文区域");
    if (!selected) return null;
    const rule = createRule(url, selected.selector);
    if (window.confirm("是否继续选择文章标题？")) {
      const title = await this.selection.pickOne("点击文章标题");
      if (title) rule.selectors.title = title.selector;
    }
    if (window.confirm("是否选择需要排除的广告、推荐或其他区域？")) {
      const excluded = await this.selection.pickMany(
        "点击需要排除的区域，再按 Enter 完成",
      );
      if (excluded) {
        rule.excludedSelectors = [
          ...new Set(excluded.map((item) => item.selector)),
        ];
      }
    }
    const validation = validateRule(rule, document);
    if (!validation.valid) {
      window.alert(validation.message ?? "选择的区域不能作为正文");
      return null;
    }
    const scope = window.prompt(
      "规则范围：输入 host（整个网站）、path（当前路径类型）或 once（仅本次）",
      "host",
    );
    if (scope === "path") {
      const segments = url.pathname.split("/").filter(Boolean);
      rule.pathPattern = segments.length > 1
        ? `/${segments.slice(0, -1).join("/")}/*`
        : `${url.pathname.replace(/\/$/, "") || "/"}*`;
    }
    if (scope === "host" || scope === "path") await this.store.upsert(rule);
    return rule;
  }

  async editAdvanced(url: URL, existing?: SiteRule): Promise<SiteRule | null> {
    const initial = existing?.selectors.content ?? "article";
    const selector = window.prompt("输入正文 CSS Selector", initial);
    if (!selector) return null;
    const rule = existing
      ? {
          ...existing,
          selectors: { ...existing.selectors, content: selector },
          updatedAt: Date.now(),
        }
      : createRule(url, selector);
    const title = window.prompt(
      "标题 Selector（可留空）",
      rule.selectors.title ?? "",
    );
    const exclusions = window.prompt(
      "排除区域 Selector，多个用英文逗号分隔（可留空）",
      rule.excludedSelectors.join(", "),
    );
    rule.selectors.title = title?.trim() || undefined;
    rule.excludedSelectors =
      exclusions
        ?.split(",")
        .map((value) => value.trim())
        .filter(Boolean) ?? [];
    const validation = validateRule(rule, document);
    if (!validation.valid) {
      window.alert(validation.message ?? "规则无效");
      return null;
    }
    await this.store.upsert(rule);
    return rule;
  }
}
