import type { SiteRule } from "../domain/rules";
import { localStorageArea, type StorageAreaLike } from "./chrome-storage";

const RULES_KEY = "siteRules";

export class RuleStore {
  constructor(private readonly area: StorageAreaLike = localStorageArea()) {}

  async all(): Promise<SiteRule[]> {
    const data = await this.area.get(RULES_KEY);
    return (data[RULES_KEY] as SiteRule[] | undefined) ?? [];
  }

  async upsert(rule: SiteRule): Promise<void> {
    const rules = await this.all();
    const next = rules.filter((item) => item.id !== rule.id);
    next.push({ ...rule, updatedAt: Date.now() });
    await this.area.set({ [RULES_KEY]: next });
  }

  async remove(id: string): Promise<void> {
    await this.area.set({
      [RULES_KEY]: (await this.all()).filter((rule) => rule.id !== id),
    });
  }
}

