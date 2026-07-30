import { describe, expect, it } from "vitest";
import { stableSelector } from "../../src/rule-editor/selection-mode";

describe("selection mode", () => {
  it("uses a unique id as the stable selector", () => {
    document.body.innerHTML = '<article id="story"><p>Text</p></article>';
    expect(stableSelector(document.querySelector("article")!)).toBe("#story");
  });
});

