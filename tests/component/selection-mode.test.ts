import { describe, expect, it } from "vitest";
import {
  SelectionMode,
  stableSelector,
} from "../../src/rule-editor/selection-mode";

describe("selection mode", () => {
  it("uses a unique id as the stable selector", () => {
    document.body.innerHTML = '<article id="story"><p>Text</p></article>';
    expect(stableSelector(document.querySelector("article")!)).toBe("#story");
  });

  it("selects multiple exclusion areas and finishes with Enter", async () => {
    document.body.innerHTML = `
      <article id="story"><p>Text</p></article>
      <aside id="ad">Ad</aside>
      <section id="recommendations">Recommendations</section>`;
    const mode = new SelectionMode();
    const pending = mode.pickMany("选择排除区域");
    for (const selector of ["#ad", "#recommendations"]) {
      const target = document.querySelector(selector)!;
      target.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await expect(pending).resolves.toEqual([
      expect.objectContaining({ selector: "#ad" }),
      expect.objectContaining({ selector: "#recommendations" }),
    ]);
    expect(document.querySelector("[data-read-ease-selector]")).toBeNull();
  });
});
