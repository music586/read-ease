import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  PAGE_DEFAULT_FONT,
  SYSTEM_SERIF_FONT,
  changedSettings,
  resolveSettings,
} from "../../src/domain/settings";

describe("settings", () => {
  it("applies only explicit site overrides", () => {
    const global = { ...DEFAULT_SETTINGS, fontSize: 20, lineHeight: 1.9 };
    expect(resolveSettings(global, { fontSize: 17 })).toMatchObject({
      fontSize: 17,
      lineHeight: 1.9,
    });
  });

  it("stores only values changed from the global settings", () => {
    expect(
      changedSettings(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS, fontSize: 22 }),
    ).toEqual({ fontSize: 22 });
  });

  it("migrates legacy font stacks to the two supported font choices", () => {
    expect(resolveSettings({ fontFamily: "Arial, sans-serif" }).fontFamily).toBe(
      PAGE_DEFAULT_FONT,
    );
    expect(resolveSettings({ fontFamily: "Georgia, serif" }).fontFamily).toBe(
      SYSTEM_SERIF_FONT,
    );
  });
});
