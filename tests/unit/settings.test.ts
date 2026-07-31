import { describe, expect, it } from "vitest";
import {
  CHINESE_SONG_FONT,
  DEFAULT_SETTINGS,
  PAGE_DEFAULT_FONT,
  SYSTEM_SANS_FONT,
  SYSTEM_SERIF_FONT,
  changedSettings,
  resolveSettings,
} from "../../src/domain/settings";

describe("settings", () => {
  it("defaults to light, system sans-serif, and justified text", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      theme: "light",
      fontFamily: SYSTEM_SANS_FONT,
      textJustify: true,
    });
  });

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

  it("migrates legacy font stacks to a compatible supported choice", () => {
    expect(resolveSettings({ fontFamily: "Arial, sans-serif" }).fontFamily).toBe(
      PAGE_DEFAULT_FONT,
    );
    expect(resolveSettings({ fontFamily: "Georgia, serif" }).fontFamily).toBe(
      SYSTEM_SERIF_FONT,
    );
  });

  it("preserves each supported font choice for future sessions", () => {
    for (const fontFamily of [
      SYSTEM_SERIF_FONT,
      SYSTEM_SANS_FONT,
      CHINESE_SONG_FONT,
      PAGE_DEFAULT_FONT,
    ]) {
      expect(resolveSettings({ fontFamily }).fontFamily).toBe(fontFamily);
    }
  });

  it("preserves the gray reading theme", () => {
    expect(resolveSettings({ theme: "gray" }).theme).toBe("gray");
  });

  it("preserves an explicit left-alignment selection", () => {
    expect(resolveSettings({ textJustify: false }).textJustify).toBe(false);
  });
});
