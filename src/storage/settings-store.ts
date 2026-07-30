import {
  DEFAULT_SETTINGS,
  resolveSettings,
  type ReaderSettings,
  type SiteSettingsOverride,
} from "../domain/settings";
import { localStorageArea, type StorageAreaLike } from "./chrome-storage";

const GLOBAL_KEY = "readerSettings";
const SITE_KEY = "siteSettings";

export class SettingsStore {
  constructor(private readonly area: StorageAreaLike = localStorageArea()) {}

  async getGlobal(): Promise<ReaderSettings> {
    const data = await this.area.get(GLOBAL_KEY);
    return resolveSettings((data[GLOBAL_KEY] as Partial<ReaderSettings>) ?? {});
  }

  async setGlobal(settings: ReaderSettings): Promise<void> {
    await this.area.set({ [GLOBAL_KEY]: settings });
  }

  async getSite(host: string): Promise<SiteSettingsOverride> {
    const data = await this.area.get(SITE_KEY);
    const sites =
      (data[SITE_KEY] as Record<string, SiteSettingsOverride> | undefined) ?? {};
    return sites[host] ?? {};
  }

  async setSite(host: string, settings: SiteSettingsOverride): Promise<void> {
    const data = await this.area.get(SITE_KEY);
    const sites =
      (data[SITE_KEY] as Record<string, SiteSettingsOverride> | undefined) ?? {};
    await this.area.set({ [SITE_KEY]: { ...sites, [host]: settings } });
  }

  async resetSite(host: string): Promise<void> {
    const data = await this.area.get(SITE_KEY);
    const sites = {
      ...((data[SITE_KEY] as Record<string, SiteSettingsOverride> | undefined) ??
        {}),
    };
    delete sites[host];
    await this.area.set({ [SITE_KEY]: sites });
  }

  async resolve(host: string): Promise<ReaderSettings> {
    return resolveSettings(await this.getGlobal(), await this.getSite(host));
  }

  async resetGlobal(): Promise<void> {
    await this.setGlobal(DEFAULT_SETTINGS);
  }
}

