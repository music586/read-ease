# Chrome Reader Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome Manifest V3 extension that extracts article content locally and presents it in a configurable, site-aware Shadow DOM reading overlay.

**Architecture:** A background service worker handles toolbar, command, permission, and navigation events. A content controller coordinates pure extraction, sanitization, rule matching, settings resolution, and a dependency-isolated Shadow DOM UI. Shared domain types keep storage, rules, extraction, and rendering independently testable.

**Tech Stack:** Node.js 22, TypeScript, Vite, Vitest, jsdom, `@mozilla/readability`, DOMPurify, Chrome Manifest V3, vanilla Shadow DOM components, Playwright with installed Chrome for extension smoke tests.

## Global Constraints

- Chrome is the only supported browser in version 1.
- Article processing is local; no article body or browsing history leaves the browser.
- Default permissions are `activeTab`, `storage`, `scripting`, and `commands`.
- Host permissions are optional and requested only when a user enables automatic reading for a site.
- The original page DOM is never replaced; reading UI is mounted in a Shadow DOM overlay and can be removed losslessly.
- Preserve images, links, headings, paragraphs, quotes, lists, code blocks, and tables; remove scripts, forms, event handlers, ads, comments, recommendations, and unrelated controls.
- Configuration precedence is built-in defaults, global user settings, then explicit site overrides.
- Extraction precedence is temporary page correction, user site rule, built-in site rule, then generic extraction.
- `.superpowers/` is local brainstorming output and must not be committed.

---

## File Map

```text
package.json                         scripts, dependencies, Node floor
tsconfig.json                        strict TypeScript configuration
vite.config.ts                       multi-entry MV3 build
public/manifest.json                 Chrome extension manifest
public/icons/icon-{16,32,48,128}.png extension toolbar icons
src/background.ts                    toolbar, command, permission, navigation orchestration
src/content/index.ts                 content-script bootstrap
src/content/reader-controller.ts     enter/exit lifecycle and subsystem coordination
src/content/page-stability.ts        bounded SPA/DOM stability detection
src/domain/article.ts                article and extraction result types
src/domain/settings.ts               typography defaults and merge logic
src/domain/rules.ts                  site rule types, matching, precedence, validation
src/extraction/extract.ts            rule-first extraction pipeline
src/extraction/readability.ts        generic Readability adapter
src/extraction/rule-extractor.ts     selector-based extraction
src/extraction/quality.ts            article quality threshold
src/sanitization/sanitize.ts         safe article HTML and absolute URL conversion
src/storage/settings-store.ts        chrome.storage adapter
src/storage/rule-store.ts            user rule persistence
src/ui/reader-view.ts                Shadow DOM overlay and article rendering
src/ui/reader-styles.ts              CSS generated from resolved typography
src/ui/appearance-popover.ts         compact Aa settings panel
src/ui/error-notice.ts               non-destructive extraction failure UI
src/rule-editor/selection-mode.ts    hover, click, multi-exclusion selection
src/rule-editor/rule-editor.ts       selection workflow, preview, persistence
tests/fixtures/*.html                representative article and noisy-page fixtures
tests/unit/*.test.ts                 pure domain/extraction/sanitization tests
tests/component/*.test.ts            Shadow DOM interaction tests
tests/e2e/extension.spec.ts           loaded-extension Chrome smoke tests
```

## Task 1: Buildable MV3 Extension Shell

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `public/manifest.json`
- Create: `public/icons/icon-16.png`
- Create: `public/icons/icon-32.png`
- Create: `public/icons/icon-48.png`
- Create: `public/icons/icon-128.png`
- Create: `src/background.ts`
- Create: `src/content/index.ts`
- Create: `tests/unit/manifest.test.ts`

**Interfaces:**
- Produces: `dist/manifest.json`, `dist/background.js`, and `dist/content.js`.
- Produces message contract `{ type: "TOGGLE_READER" }` from background to content script.

- [ ] **Step 1: Write the manifest/build contract test**

```ts
// tests/unit/manifest.test.ts
import { describe, expect, it } from "vitest";
import manifest from "../../public/manifest.json";

describe("manifest", () => {
  it("uses MV3 with minimal default permissions", () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions.sort()).toEqual(
      ["activeTab", "commands", "scripting", "storage"].sort(),
    );
    expect(manifest).not.toHaveProperty("host_permissions");
    expect(manifest.optional_host_permissions).toEqual(["https://*/*", "http://*/*"]);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- --run tests/unit/manifest.test.ts`  
Expected: FAIL because `package.json` and `public/manifest.json` do not exist.

- [ ] **Step 3: Add the project shell and MV3 entry points**

Use strict TypeScript and a Vite Rollup input map:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background.ts"),
        content: resolve(__dirname, "src/content/index.ts"),
      },
      output: { entryFileNames: "[name].js", chunkFileNames: "chunks/[name]-[hash].js" },
    },
  },
});
```

Configure `package.json` scripts as:

```json
{
  "scripts": {
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test"
  },
  "engines": { "node": ">=22" }
}
```

The background worker must listen to `chrome.action.onClicked` and `chrome.commands.onCommand`, inject `content.js` when needed, then send `{ type: "TOGGLE_READER" }`. The content entry initially acknowledges that message without changing the page.

Add `.superpowers/`, `node_modules/`, `dist/`, `coverage/`, and Playwright output to `.gitignore`.

- [ ] **Step 4: Install dependencies and run shell verification**

Run: `npm install`  
Run: `npm test -- --run tests/unit/manifest.test.ts`  
Run: `npm run typecheck`  
Run: `npm run build`  
Expected: all commands succeed and the three required `dist` files exist.

- [ ] **Step 5: Commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.json vite.config.ts public src/background.ts src/content/index.ts tests/unit/manifest.test.ts
git commit -m "build: scaffold Chrome MV3 extension"
```

## Task 2: Settings and Site Rule Domain

**Files:**
- Create: `src/domain/settings.ts`
- Create: `src/domain/rules.ts`
- Create: `src/storage/settings-store.ts`
- Create: `src/storage/rule-store.ts`
- Create: `tests/unit/settings.test.ts`
- Create: `tests/unit/rules.test.ts`

**Interfaces:**
- Produces: `ReaderSettings`, `SiteSettingsOverride`, `DEFAULT_SETTINGS`, `resolveSettings(global, site)`.
- Produces: `SiteRule`, `RuleSelectors`, `matchRule(url, rules)`, `validateRule(rule, document)`.
- Produces: `SettingsStore` and `RuleStore` async storage adapters.

- [ ] **Step 1: Write failing settings and rule tests**

```ts
// tests/unit/settings.test.ts
it("applies only explicit site overrides", () => {
  const global = { ...DEFAULT_SETTINGS, fontSize: 20, lineHeight: 1.9 };
  expect(resolveSettings(global, { fontSize: 17 })).toMatchObject({
    fontSize: 17,
    lineHeight: 1.9,
  });
});

// tests/unit/rules.test.ts
it("prefers the most specific matching path", () => {
  const broad = makeRule("example.com", "/*");
  const article = makeRule("example.com", "/article/*");
  expect(matchRule(new URL("https://example.com/article/42"), [broad, article])).toBe(article);
});

it("rejects body as a content selector", () => {
  expect(validateRule(makeRule("example.com", "/*", { content: "body" }), document))
    .toMatchObject({ valid: false });
});
```

- [ ] **Step 2: Run tests and verify failures**

Run: `npm test -- --run tests/unit/settings.test.ts tests/unit/rules.test.ts`  
Expected: FAIL because domain modules do not exist.

- [ ] **Step 3: Implement typed defaults, merge, matching, and validation**

Define:

```ts
export type ReaderTheme = "light" | "sepia" | "dark";
export interface ReaderSettings {
  theme: ReaderTheme;
  fontFamily: string;
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
  paragraphSpacing: number;
  contentWidth: number;
  pageMargin: number;
}
export type SiteSettingsOverride = Partial<ReaderSettings>;
export const resolveSettings = (
  global: ReaderSettings,
  site: SiteSettingsOverride = {},
): ReaderSettings => ({ ...DEFAULT_SETTINGS, ...global, ...site });
```

Define `SiteRule` with `id`, `host`, `pathPattern`, `selectors`, `excludedSelectors`, `autoEnter`, `settings`, `source`, and `updatedAt`. Escape regex metacharacters before expanding `*`; rank matching rules by literal path length. Validate that the content selector parses, matches at least one element, does not directly select `html`, `body`, or `:root`, and yields at least 200 trimmed characters.

Storage adapters must accept a `chrome.storage.StorageArea` dependency so tests can use an in-memory fake.

- [ ] **Step 4: Run domain tests**

Run: `npm test -- --run tests/unit/settings.test.ts tests/unit/rules.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain src/storage tests/unit/settings.test.ts tests/unit/rules.test.ts
git commit -m "feat: add settings and site rule domain"
```

## Task 3: Article Extraction, Quality, and Sanitization

**Files:**
- Create: `src/domain/article.ts`
- Create: `src/extraction/readability.ts`
- Create: `src/extraction/rule-extractor.ts`
- Create: `src/extraction/quality.ts`
- Create: `src/extraction/extract.ts`
- Create: `src/sanitization/sanitize.ts`
- Create: `tests/fixtures/noisy-article.html`
- Create: `tests/fixtures/selector-article.html`
- Create: `tests/unit/extraction.test.ts`
- Create: `tests/unit/sanitize.test.ts`

**Interfaces:**
- Produces: `Article`, `ExtractionAttempt`, `ExtractionSource`, and `ExtractionError`.
- Produces: `extractArticle(document, url, options): ExtractionAttempt`.
- Produces: `sanitizeArticleHtml(html, baseUrl): string`.

- [ ] **Step 1: Write failing extraction and sanitizer tests**

```ts
it("uses a valid user rule before generic extraction", () => {
  const attempt = extractArticle(document, new URL("https://example.com/post/1"), {
    userRule: makeRuleWithContent(".story"),
  });
  expect(attempt.source).toBe("user-rule");
  expect(attempt.article?.contentHtml).toContain("Meaningful article paragraph");
});

it("removes executable markup and resolves relative assets", () => {
  const clean = sanitizeArticleHtml(
    `<p onclick="steal()">Text</p><script>steal()</script><img src="/hero.jpg">`,
    new URL("https://example.com/a/"),
  );
  expect(clean).not.toContain("script");
  expect(clean).not.toContain("onclick");
  expect(clean).toContain('src="https://example.com/hero.jpg"');
});
```

- [ ] **Step 2: Run tests and verify failures**

Run: `npm test -- --run tests/unit/extraction.test.ts tests/unit/sanitize.test.ts`  
Expected: FAIL because extraction and sanitizer modules do not exist.

- [ ] **Step 3: Implement the extraction pipeline**

Clone the document before passing it to Readability. Selector extraction must combine all matching content nodes in document order, read optional metadata selectors, remove configured exclusion matches from the clone, and return the shared `Article` shape.

`extractArticle` attempts:

1. temporary rule
2. user rule
3. built-in rule
4. generic Readability adapter

Each attempt passes `assessQuality`, which requires at least 200 trimmed characters and at least two content blocks. Failed rule attempts continue to the next source and are recorded in `warnings`. If all sources fail, return an `ExtractionError` rather than throwing into the page.

- [ ] **Step 4: Implement DOMPurify sanitization**

Allow semantic article tags and required attributes only. For `href`, `src`, `srcset`, and `poster`, resolve safe relative URLs against `baseUrl`; remove `javascript:`, `data:text/html`, event handler attributes, forms, iframes, scripts, styles, and custom elements. Add `rel="noopener noreferrer"` to external links.

- [ ] **Step 5: Run extraction tests**

Run: `npm test -- --run tests/unit/extraction.test.ts tests/unit/sanitize.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/article.ts src/extraction src/sanitization tests/fixtures tests/unit/extraction.test.ts tests/unit/sanitize.test.ts
git commit -m "feat: extract and sanitize article content"
```

## Task 4: Shadow DOM Reader and Appearance Controls

**Files:**
- Create: `src/ui/reader-styles.ts`
- Create: `src/ui/appearance-popover.ts`
- Create: `src/ui/reader-view.ts`
- Create: `tests/component/reader-view.test.ts`
- Create: `tests/component/appearance-popover.test.ts`

**Interfaces:**
- Produces: `ReaderView.mount(article, settings, callbacks): ReaderViewHandle`.
- `ReaderViewHandle` exposes `updateSettings(settings)`, `closePopover()`, and `unmount()`.
- Callback contract: `{ onExit, onSettingsChange, onResetSettings, onEditRule }`.

- [ ] **Step 1: Write failing Shadow DOM component tests**

```ts
it("mounts an isolated overlay and renders article metadata", () => {
  const handle = ReaderView.mount(article, DEFAULT_SETTINGS, callbacks);
  const host = document.querySelector("[data-read-ease-host]");
  expect(host?.shadowRoot?.textContent).toContain(article.title);
  expect(host?.shadowRoot?.querySelector("[data-action=appearance]")).not.toBeNull();
  handle.unmount();
  expect(document.querySelector("[data-read-ease-host]")).toBeNull();
});

it("emits a partial site override when site-only is enabled", () => {
  const view = mountPopover();
  click(view, "[data-setting=site-only]");
  change(view, "[data-setting=font-size]", "19");
  expect(onSettingsChange).toHaveBeenCalledWith({ fontSize: 19 }, "site");
});
```

- [ ] **Step 2: Run tests and verify failures**

Run: `npm test -- --run tests/component/reader-view.test.ts tests/component/appearance-popover.test.ts`  
Expected: FAIL because UI modules do not exist.

- [ ] **Step 3: Implement the reader overlay**

Create one fixed-position host with the highest practical z-index and an open Shadow Root. Render metadata and sanitized content inside a centered article. The only persistent controls are `Aa` and `×`; `Escape` exits. Clicking outside the compact appearance popover closes it.

Generate CSS custom properties from `ReaderSettings`:

```ts
export const settingsVariables = (s: ReaderSettings) => ({
  "--re-font-family": s.fontFamily,
  "--re-font-size": `${s.fontSize}px`,
  "--re-letter-spacing": `${s.letterSpacing}em`,
  "--re-line-height": String(s.lineHeight),
  "--re-paragraph-spacing": `${s.paragraphSpacing}em`,
  "--re-content-width": `${s.contentWidth}px`,
  "--re-page-margin": `${s.pageMargin}px`,
});
```

The appearance popover includes the three themes, font, font size, letter spacing, line height, paragraph spacing, content width, page margin, site-only toggle, and reset action. Inputs update the view immediately before persistence completes.

- [ ] **Step 4: Run component tests**

Run: `npm test -- --run tests/component/reader-view.test.ts tests/component/appearance-popover.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui tests/component/reader-view.test.ts tests/component/appearance-popover.test.ts
git commit -m "feat: add configurable Shadow DOM reader"
```

## Task 5: Reader Lifecycle and Non-Destructive Failure Handling

**Files:**
- Create: `src/ui/error-notice.ts`
- Create: `src/content/reader-controller.ts`
- Modify: `src/content/index.ts`
- Create: `tests/component/reader-controller.test.ts`

**Interfaces:**
- Produces: `ReaderController.toggle()` and `ReaderController.exit()`.
- Consumes: stores, rule matching, `extractArticle`, `sanitizeArticleHtml`, and `ReaderView`.
- Error callback actions: `"retry" | "select-content" | "advanced-rule" | "cancel"`.

- [ ] **Step 1: Write failing lifecycle tests**

```ts
it("does not mount the overlay when extraction fails", async () => {
  extractor.mockReturnValue({ ok: false, error: { code: "LOW_QUALITY" } });
  await controller.toggle();
  expect(readerView.mount).not.toHaveBeenCalled();
  expect(errorNotice.show).toHaveBeenCalled();
});

it("restores scroll position after exit", async () => {
  vi.spyOn(window, "scrollY", "get").mockReturnValue(640);
  await controller.toggle();
  controller.exit();
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 640, behavior: "instant" });
});
```

- [ ] **Step 2: Run the test and verify failures**

Run: `npm test -- --run tests/component/reader-controller.test.ts`  
Expected: FAIL because the controller does not exist.

- [ ] **Step 3: Implement controller state transitions**

Use explicit states `"idle" | "extracting" | "reading" | "selecting"`. Ignore duplicate toggles while extracting. Save scroll position before extraction, but mount only after successful extraction and sanitization. On exit, unmount the view, remove key listeners, restore plugin-paused media, and call `scrollTo`.

Persist global setting changes in `SettingsStore`; persist only changed properties as the current host's override when scope is `"site"`.

- [ ] **Step 4: Implement the failure notice**

Render a small, isolated Shadow DOM notice over the unchanged original page with actions for retry, manual selection, advanced rule editing, and cancel. Do not inject the full reader host on failure.

- [ ] **Step 5: Run lifecycle and regression tests**

Run: `npm test -- --run tests/component/reader-controller.test.ts`  
Run: `npm run typecheck`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content src/ui/error-notice.ts tests/component/reader-controller.test.ts
git commit -m "feat: coordinate non-destructive reader lifecycle"
```

## Task 6: Visual Site Rule Editor

**Files:**
- Create: `src/rule-editor/selection-mode.ts`
- Create: `src/rule-editor/rule-editor.ts`
- Create: `tests/component/selection-mode.test.ts`
- Create: `tests/component/rule-editor.test.ts`
- Modify: `src/content/reader-controller.ts`

**Interfaces:**
- Produces: `SelectionMode.pickOne(kind)` and `SelectionMode.pickMany(kind)`.
- Produces: `RuleEditor.start(url, existingRule?): Promise<SiteRule | null>`.
- Consumes: `validateRule`, `extractArticle`, `RuleStore`.

- [ ] **Step 1: Write failing selection tests**

```ts
it("highlights hovered elements without changing their inline style", () => {
  const before = target.getAttribute("style");
  mode.start();
  target.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  expect(document.querySelector("[data-read-ease-highlight]")).not.toBeNull();
  expect(target.getAttribute("style")).toBe(before);
});

it("creates a stable selector for the chosen content element", async () => {
  const pending = mode.pickOne("content");
  target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await expect(pending).resolves.toMatchObject({ selector: "article#story" });
});
```

- [ ] **Step 2: Run tests and verify failures**

Run: `npm test -- --run tests/component/selection-mode.test.ts tests/component/rule-editor.test.ts`  
Expected: FAIL because rule editor modules do not exist.

- [ ] **Step 3: Implement non-invasive page selection**

Render highlight and instruction overlays in a dedicated Shadow DOM. Use capture-phase listeners and prevent navigation while selecting. Generate selectors in this order: unique ID, stable class combination, semantic ancestor plus `:nth-of-type`. Never mutate the selected element. Restore all listeners and overlays on finish or cancel.

- [ ] **Step 4: Implement the rule workflow**

Guide the user through content, optional title, zero-or-more exclusions, live preview, and scope selection (`once`, `host`, or `path`). Host/path saves call `validateRule` before `RuleStore.upsert`; once returns a temporary rule without persistence. Advanced mode edits the same typed selector fields in text inputs and shows exact validation errors.

- [ ] **Step 5: Connect “修正此网站” and extraction failure actions**

The reader controller must exit the overlay before selection, start the editor, then rerun extraction with the returned rule. Cancel restores the original page without entering reading mode.

- [ ] **Step 6: Run rule editor tests**

Run: `npm test -- --run tests/component/selection-mode.test.ts tests/component/rule-editor.test.ts tests/component/reader-controller.test.ts`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/rule-editor src/content/reader-controller.ts tests/component/selection-mode.test.ts tests/component/rule-editor.test.ts
git commit -m "feat: add visual site rule editor"
```

## Task 7: Optional Host Permissions and Automatic Mode

**Files:**
- Modify: `src/background.ts`
- Create: `src/content/page-stability.ts`
- Modify: `src/content/index.ts`
- Modify: `src/storage/rule-store.ts`
- Create: `tests/unit/page-stability.test.ts`
- Create: `tests/unit/permissions.test.ts`

**Interfaces:**
- Background messages: `ENABLE_AUTO_ENTER`, `DISABLE_AUTO_ENTER`, `PAGE_NAVIGATED`.
- Produces: `requestSitePermission(origin): Promise<boolean>`.
- Produces: `waitForPageStability(options): Promise<"stable" | "timeout">`.

- [ ] **Step 1: Write failing permission and stability tests**

```ts
it("requests only the current origin wildcard", async () => {
  await requestSitePermission(new URL("https://news.example.com/a"));
  expect(chrome.permissions.request).toHaveBeenCalledWith({
    origins: ["https://news.example.com/*"],
  });
});

it("resolves after mutations remain quiet for 300 ms", async () => {
  const result = waitForPageStability({ quietMs: 300, timeoutMs: 3000 });
  await vi.advanceTimersByTimeAsync(301);
  await expect(result).resolves.toBe("stable");
});
```

- [ ] **Step 2: Run tests and verify failures**

Run: `npm test -- --run tests/unit/page-stability.test.ts tests/unit/permissions.test.ts`  
Expected: FAIL because permission and stability functions do not exist.

- [ ] **Step 3: Implement explicit host permission management**

When auto-enter is enabled, request only `${url.origin}/*`. Persist `autoEnter: true` only after permission succeeds, then register a persistent, origin-scoped content script through `chrome.scripting.registerContentScripts`. Disabling auto-enter updates the rule, unregisters the origin-scoped script when no other automatic rule uses it, and removes the origin permission. A rejected permission leaves the rule manual.

- [ ] **Step 4: Implement bounded navigation handling**

The registered content script runs on matching granted origins at `document_idle` and asks the controller to evaluate the initial URL. It also wraps `history.pushState` and `history.replaceState` to dispatch a namespaced URL-change event, and listens for `popstate`; it does not require `tabs` or `webNavigation` permission.

`waitForPageStability` uses a `MutationObserver`, 300 ms quiet window, and 3 second hard timeout. After stability or timeout, match the URL, extract once, and auto-enter only when quality passes. Track the last explicitly exited URL in memory and suppress reentry until URL changes.

- [ ] **Step 5: Run permission, stability, and controller tests**

Run: `npm test -- --run tests/unit/page-stability.test.ts tests/unit/permissions.test.ts tests/component/reader-controller.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/background.ts src/content src/storage/rule-store.ts tests/unit/page-stability.test.ts tests/unit/permissions.test.ts
git commit -m "feat: add permission-scoped automatic reader mode"
```

## Task 8: Integrated Fixtures, Chrome Smoke Test, and Release Verification

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/fixtures/article.html`
- Create: `tests/e2e/extension.spec.ts`
- Create: `scripts/check-dist.mjs`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Consumes the built `dist/` extension.
- Produces a documented local build/load/test workflow.

- [ ] **Step 1: Add a failing distribution check**

```js
// scripts/check-dist.mjs
import { access, readFile } from "node:fs/promises";

await Promise.all([
  access("dist/manifest.json"),
  access("dist/background.js"),
  access("dist/content.js"),
]);
const manifest = JSON.parse(await readFile("dist/manifest.json", "utf8"));
if (manifest.manifest_version !== 3) throw new Error("Expected Manifest V3");
```

Add `"check:dist": "node scripts/check-dist.mjs"` and run it before building.  
Expected: FAIL when `dist/` is absent.

- [ ] **Step 2: Add the loaded-extension smoke test**

Launch persistent Chromium with:

```ts
const context = await chromium.launchPersistentContext(profileDir, {
  channel: "chrome",
  headless: false,
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
});
```

Serve the local article fixture, trigger reader entry through the background worker, and assert:

- the Shadow DOM host appears,
- article title and body are visible,
- `Aa` opens the compact popover,
- a typography change updates a CSS variable,
- `Escape` removes the host,
- the original page remains present and scroll position is restored.

- [ ] **Step 3: Document development and manual QA**

`README.md` must include Node 22 setup, `npm install`, `npm run build`, loading `dist/` through `chrome://extensions`, permissions behavior, test commands, privacy behavior, and a manual checklist for a static article, an SPA article, an invalid selector, rejected host permission, and automatic-entry suppression after exit.

- [ ] **Step 4: Run the complete verification suite**

Run: `npm run typecheck`  
Run: `npm run test:run`  
Run: `npm run build`  
Run: `npm run check:dist`  
Run: `npm run test:e2e`  
Run: `git diff --check`  
Expected: all commands pass. If the environment cannot show headed Chrome, record the exact E2E command as unrun and complete the README manual checklist in a local Chrome session before release.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json playwright.config.ts scripts/check-dist.mjs tests/e2e README.md
git commit -m "test: verify packaged reader extension"
```

## Final Acceptance

- [ ] Load `dist/` as an unpacked extension in Chrome with no manifest errors.
- [ ] Confirm manual entry works without permanent host access.
- [ ] Confirm content never leaves the browser using DevTools Network while entering reader mode.
- [ ] Confirm extraction failure does not hide or mutate the source page.
- [ ] Confirm user rules override built-in and generic extraction.
- [ ] Confirm global typography updates flow through sites without explicit overrides.
- [ ] Confirm enabling auto-enter requests only the current origin.
- [ ] Confirm exiting an auto-entered page does not immediately reopen it.
- [ ] Confirm all automated verification commands pass.
