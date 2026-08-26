import { describe, expect, it, vi } from "vitest";
import { ReaderController } from "../../src/content/reader-controller";
import { RuleEditor } from "../../src/rule-editor/rule-editor";
import { SelectionMode } from "../../src/rule-editor/selection-mode";
import type { StorageAreaLike } from "../../src/storage/chrome-storage";
import { RuleStore } from "../../src/storage/rule-store";
import { ReadingPositionStore } from "../../src/storage/reading-position-store";
import { SettingsStore } from "../../src/storage/settings-store";

class MemoryStorage implements StorageAreaLike {
  private readonly values: Record<string, unknown> = {};

  async get(): Promise<Record<string, unknown>> {
    return { ...this.values };
  }

  async set(items: Record<string, unknown>): Promise<void> {
    Object.assign(this.values, items);
  }
}

describe("reader controller", () => {
  it("uses the first Escape to close an image preview and the next to exit reading mode", async () => {
    const storage = new MemoryStorage();
    const controller = new ReaderController(
      new SettingsStore(storage),
      new RuleStore(storage),
      new RuleEditor(new SelectionMode(), new RuleStore(storage)),
      new ReadingPositionStore(storage),
    );
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    document.body.innerHTML = `<article><h1>测试文章</h1><p>${"这是一段用于阅读模式提取的正文内容。".repeat(40)}</p><img src="https://example.com/photo.jpg" alt="测试图片"><p>${"继续阅读正文。".repeat(20)}</p></article>`;

    await controller.enter();
    const host = document.querySelector<HTMLElement>("[data-read-ease-host]");
    const image = host?.shadowRoot?.querySelector<HTMLImageElement>(".content img");
    image?.click();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.querySelector("[data-read-ease-host]")).not.toBeNull();
    expect(host?.shadowRoot?.querySelector<HTMLElement>(".image-preview")?.hidden)
      .toBe(true);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(
      document
        .querySelector<HTMLElement>("[data-read-ease-host]")
        ?.shadowRoot?.querySelector<HTMLElement>(".overlay")?.dataset
        .transitionState,
    ).toBe("exiting");
    scrollTo.mockRestore();
  });

  it("restores the saved reader scroll position when the same URL is opened again", async () => {
    const storage = new MemoryStorage();
    const controller = new ReaderController(
      new SettingsStore(storage),
      new RuleStore(storage),
      new RuleEditor(new SelectionMode(), new RuleStore(storage)),
      new ReadingPositionStore(storage),
    );
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    document.body.innerHTML = `<article><h1>测试文章</h1><p>${"这是一段用于阅读模式提取的正文内容。".repeat(50)}</p><p>${"继续阅读正文。".repeat(30)}</p></article>`;

    await controller.enter();
    const firstOverlay = document
      .querySelector<HTMLElement>("[data-read-ease-host]")
      ?.shadowRoot?.querySelector<HTMLElement>(".overlay");
    Object.defineProperties(firstOverlay, {
      clientHeight: { value: 600 },
      scrollHeight: { value: 2400 },
      scrollTop: { value: 730, writable: true },
    });

    controller.exit();
    await Promise.resolve();
    await controller.enter();

    const restoredOverlay = document
      .querySelector<HTMLElement>("[data-read-ease-host]")
      ?.shadowRoot?.querySelector<HTMLElement>(".overlay");
    Object.defineProperties(restoredOverlay, {
      clientHeight: { value: 600 },
      scrollHeight: { value: 2400 },
      scrollTop: { value: restoredOverlay?.scrollTop ?? 0, writable: true },
    });
    expect(restoredOverlay?.scrollTop).toBe(730);
    controller.exit();
    scrollTo.mockRestore();
  });
});
