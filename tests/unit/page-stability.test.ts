import { describe, expect, it, vi } from "vitest";
import { waitForPageStability } from "../../src/content/page-stability";

describe("page stability", () => {
  it("resolves after the DOM remains quiet", async () => {
    vi.useFakeTimers();
    const result = waitForPageStability({ quietMs: 300, timeoutMs: 3000 });
    await vi.advanceTimersByTimeAsync(301);
    await expect(result).resolves.toBe("stable");
    vi.useRealTimers();
  });
});

