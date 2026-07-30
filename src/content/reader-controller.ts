import { DEFAULT_SETTINGS, changedSettings, resolveSettings, type ReaderSettings } from "../domain/settings";
import { matchRule, type SiteRule } from "../domain/rules";
import { extractArticle } from "../extraction/extract";
import { RuleEditor } from "../rule-editor/rule-editor";
import { sanitizeArticleHtml } from "../sanitization/sanitize";
import { RuleStore } from "../storage/rule-store";
import { SettingsStore } from "../storage/settings-store";
import type { SettingsScope } from "../ui/appearance-popover";
import { showErrorNotice, type FailureAction } from "../ui/error-notice";
import { mountReaderView, type ReaderViewHandle } from "../ui/reader-view";
import { waitForPageStability } from "./page-stability";

type ControllerState = "idle" | "extracting" | "reading" | "selecting";

export class ReaderController {
  private state: ControllerState = "idle";
  private view: ReaderViewHandle | null = null;
  private scrollPosition = 0;
  private currentSettings = DEFAULT_SETTINGS;
  private currentRule: SiteRule | undefined;
  private temporaryRule: SiteRule | undefined;
  private removeNotice: (() => void) | null = null;
  private suppressedUrl: string | null = null;

  constructor(
    private readonly settingsStore = new SettingsStore(),
    private readonly ruleStore = new RuleStore(),
    private readonly ruleEditor = new RuleEditor(),
  ) {}

  async toggle(): Promise<void> {
    if (this.state === "reading") {
      this.exit();
      return;
    }
    if (this.state !== "idle") return;
    await this.enter();
  }

  async enter(automatic = false): Promise<void> {
    if (automatic && this.suppressedUrl === location.href) return;
    if (this.state !== "idle") return;
    this.state = "extracting";
    this.removeNotice?.();
    const url = new URL(location.href);
    const rules = await this.ruleStore.all();
    this.currentRule = matchRule(url, rules);
    const result = extractArticle(document, url, {
      temporaryRule: this.temporaryRule,
      userRule: this.currentRule,
    });
    if (!result.ok) {
      this.state = "idle";
      this.removeNotice = showErrorNotice((action) => void this.handleFailure(action));
      return;
    }
    const global = await this.settingsStore.getGlobal();
    this.currentSettings = resolveSettings(
      global,
      await this.settingsStore.getSite(url.hostname),
    );
    const safeHtml = sanitizeArticleHtml(result.article.contentHtml, url);
    this.scrollPosition = window.scrollY;
    this.view = mountReaderView(result.article, safeHtml, this.currentSettings, {
      onExit: () => this.exit(),
      onSettingsChange: (settings, scope) =>
        void this.updateSettings(settings, scope),
      onResetSettings: (scope) => void this.resetSettings(scope),
      onEditRule: () => void this.startRuleSelection(),
      onAutoEnterChange: (enabled) => void this.setAutoEnter(enabled),
      autoEnter: this.currentRule?.autoEnter ?? false,
    });
    document.addEventListener("keydown", this.onKeydown, true);
    this.state = "reading";
  }

  exit(manual = true): void {
    if (manual && this.currentRule?.autoEnter) this.suppressedUrl = location.href;
    this.view?.unmount();
    this.view = null;
    this.removeNotice?.();
    this.removeNotice = null;
    document.removeEventListener("keydown", this.onKeydown, true);
    window.scrollTo({ top: this.scrollPosition, behavior: "instant" });
    this.state = "idle";
  }

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.state === "reading") {
      event.preventDefault();
      this.exit();
    }
  };

  private async updateSettings(
    settings: ReaderSettings,
    scope: SettingsScope,
  ): Promise<void> {
    this.currentSettings = settings;
    this.view?.updateSettings(settings);
    const host = location.hostname;
    if (scope === "global") {
      await this.settingsStore.setGlobal(settings);
    } else {
      await this.settingsStore.setSite(
        host,
        changedSettings(await this.settingsStore.getGlobal(), settings),
      );
    }
  }

  private async resetSettings(scope: SettingsScope): Promise<void> {
    if (scope === "site") await this.settingsStore.resetSite(location.hostname);
    else await this.settingsStore.resetGlobal();
    this.currentSettings = await this.settingsStore.resolve(location.hostname);
    this.view?.updateSettings(this.currentSettings);
  }

  private async startRuleSelection(advanced = false): Promise<void> {
    this.view?.unmount();
    this.view = null;
    this.state = "selecting";
    const url = new URL(location.href);
    const rule = advanced
      ? await this.ruleEditor.editAdvanced(url, this.currentRule)
      : await this.ruleEditor.selectContent(url);
    this.state = "idle";
    if (rule) {
      this.temporaryRule = rule;
      await this.enter();
    }
  }

  private async handleFailure(action: FailureAction): Promise<void> {
    this.removeNotice = null;
    if (action === "retry") {
      await waitForPageStability();
      await this.enter();
    }
    if (action === "select-content") await this.startRuleSelection();
    if (action === "advanced-rule") await this.startRuleSelection(true);
  }

  async maybeAutoEnter(): Promise<void> {
    const rule = matchRule(new URL(location.href), await this.ruleStore.all());
    if (!rule?.autoEnter) return;
    this.currentRule = rule;
    await this.enter(true);
  }

  onUrlChanged(): void {
    if (this.suppressedUrl !== location.href) this.suppressedUrl = null;
    if (this.state === "reading") this.exit(false);
    void this.maybeAutoEnter();
  }

  private async setAutoEnter(enabled: boolean): Promise<void> {
    if (!this.currentRule) {
      window.alert("请先使用“修正此网站”保存一条网站规则，再开启自动进入。");
      this.view?.unmount();
      this.view = null;
      this.state = "idle";
      await this.enter();
      return;
    }
    const origin = location.origin;
    const response = (await chrome.runtime.sendMessage({
      type: enabled ? "ENABLE_AUTO_ENTER" : "DISABLE_AUTO_ENTER",
      origin,
    })) as { ok: boolean };
    if (!response.ok) {
      window.alert("未获得该网站权限，自动进入没有开启。");
      return;
    }
    this.currentRule = { ...this.currentRule, autoEnter: enabled };
    await this.ruleStore.upsert(this.currentRule);
  }
}
