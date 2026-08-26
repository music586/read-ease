import { describe, expect, it } from "vitest";
import type { StorageAreaLike } from "../../src/storage/chrome-storage";
import { ReadingPositionStore } from "../../src/storage/reading-position-store";

class MemoryStorage implements StorageAreaLike {
  private values: Record<string, unknown> = {};

  async get(): Promise<Record<string, unknown>> {
    return structuredClone(this.values);
  }

  async set(items: Record<string, unknown>): Promise<void> {
    this.values = { ...this.values, ...structuredClone(items) };
  }
}

describe("reading position store", () => {
  it("keeps independent scroll positions for complete article URLs", async () => {
    const store = new ReadingPositionStore(new MemoryStorage());

    await store.set("https://example.com/article?id=1", 420);
    await store.set("https://example.com/article?id=2", 960);

    expect(await store.get("https://example.com/article?id=1")).toBe(420);
    expect(await store.get("https://example.com/article?id=2")).toBe(960);
    expect(await store.get("https://example.com/article?id=3")).toBe(0);
  });
});
