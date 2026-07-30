export interface SelectionResult {
  element: Element;
  selector: string;
}

function cssEscape(value: string): string {
  return globalThis.CSS?.escape
    ? globalThis.CSS.escape(value)
    : value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

export function stableSelector(element: Element): string {
  if (element.id) {
    const selector = `#${cssEscape(element.id)}`;
    if (document.querySelectorAll(selector).length === 1) return selector;
  }
  const tag = element.tagName.toLowerCase();
  const classes = [...element.classList]
    .filter((name) => !name.match(/active|hover|selected|focus/i))
    .slice(0, 3)
    .map((name) => `.${cssEscape(name)}`)
    .join("");
  if (classes) {
    const selector = `${tag}${classes}`;
    if (document.querySelectorAll(selector).length === 1) return selector;
  }
  const parent = element.parentElement;
  if (!parent) return tag;
  const siblings = [...parent.children].filter(
    (sibling) => sibling.tagName === element.tagName,
  );
  return `${stableSelector(parent)} > ${tag}:nth-of-type(${siblings.indexOf(element) + 1})`;
}

export class SelectionMode {
  private host: HTMLElement | null = null;
  private highlight: HTMLElement | null = null;
  private target: Element | null = null;
  private mode: "one" | "many" = "one";
  private selected = new Map<
    string,
    { result: SelectionResult; overlay: HTMLElement }
  >();
  private resolveOne: ((result: SelectionResult | null) => void) | null = null;
  private resolveMany:
    | ((results: SelectionResult[] | null) => void)
    | null = null;

  pickOne(instruction: string): Promise<SelectionResult | null> {
    this.stop();
    this.mode = "one";
    this.mount(instruction, false);
    document.addEventListener("mouseover", this.onHover, true);
    document.addEventListener("click", this.onClick, true);
    document.addEventListener("keydown", this.onKeydown, true);
    return new Promise((resolve) => {
      this.resolveOne = resolve;
    });
  }

  pickMany(instruction: string): Promise<SelectionResult[] | null> {
    this.stop();
    this.mode = "many";
    this.mount(instruction, true);
    document.addEventListener("mouseover", this.onHover, true);
    document.addEventListener("click", this.onClick, true);
    document.addEventListener("keydown", this.onKeydown, true);
    return new Promise((resolve) => {
      this.resolveMany = resolve;
    });
  }

  cancel(): void {
    const resolveOne = this.resolveOne;
    const resolveMany = this.resolveMany;
    this.stop();
    resolveOne?.(null);
    resolveMany?.(null);
  }

  private mount(instruction: string, multi: boolean): void {
    this.host = document.createElement("div");
    this.host.dataset.readEaseSelector = "";
    const shadow = this.host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .hint { position:fixed; top:18px; left:50%; transform:translateX(-50%);
          z-index:2147483647; padding:8px 10px 8px 14px; border-radius:999px;
          color:#fff; background:#263224; box-shadow:0 8px 26px #0005;
          font:600 13px/1.2 ui-sans-serif,system-ui; display:flex;
          align-items:center; gap:10px; white-space:nowrap; }
        .highlight { position:fixed; z-index:2147483646; pointer-events:none;
          border:3px solid #6d9c58; background:#83bd6840; border-radius:4px; }
        .selected { position:fixed; z-index:2147483645; pointer-events:none;
          border:3px solid #c75b4f; background:#d96b5c35; border-radius:4px; }
        button { border:0; border-radius:999px; padding:7px 11px; cursor:pointer;
          color:#20301e; background:#f2f5ed; font:700 12px/1 ui-sans-serif,system-ui; }
      </style>
      <div class="hint">
        <span>${instruction}${multi ? " · 已选 0 个" : " · Esc 取消"}</span>
        ${multi ? '<button type="button" data-action="finish">完成（Enter）</button><button type="button" data-action="cancel">取消</button>' : ""}
      </div>
      <div class="highlight"></div>`;
    this.highlight = shadow.querySelector(".highlight");
    shadow
      .querySelector("[data-action=finish]")
      ?.addEventListener("click", () => this.finishMany());
    shadow
      .querySelector("[data-action=cancel]")
      ?.addEventListener("click", () => this.cancel());
    document.documentElement.append(this.host);
  }

  private readonly onHover = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element) || this.host?.contains(target)) return;
    this.target = target;
    const rect = target.getBoundingClientRect();
    if (!this.highlight) return;
    Object.assign(this.highlight.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  };

  private readonly onClick = (event: Event): void => {
    if (!this.target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const result = {
      element: this.target,
      selector: stableSelector(this.target),
    };
    if (this.mode === "many") {
      this.toggleMany(result);
      return;
    }
    const resolve = this.resolveOne;
    this.stop();
    resolve?.(result);
  };

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Enter" && this.mode === "many") {
      event.preventDefault();
      this.finishMany();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      this.cancel();
    }
  };

  private toggleMany(result: SelectionResult): void {
    const existing = this.selected.get(result.selector);
    if (existing) {
      existing.overlay.remove();
      this.selected.delete(result.selector);
    } else {
      const overlay = document.createElement("div");
      overlay.className = "selected";
      const rect = result.element.getBoundingClientRect();
      Object.assign(overlay.style, {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
      this.host?.shadowRoot?.append(overlay);
      this.selected.set(result.selector, { result, overlay });
    }
    const label = this.host?.shadowRoot?.querySelector(".hint span");
    if (label) {
      label.textContent = `点击广告、推荐等区域 · 已选 ${this.selected.size} 个`;
    }
  }

  private finishMany(): void {
    if (this.mode !== "many") return;
    const results = [...this.selected.values()].map(({ result }) => result);
    const resolve = this.resolveMany;
    this.stop();
    resolve?.(results);
  }

  private stop(): void {
    document.removeEventListener("mouseover", this.onHover, true);
    document.removeEventListener("click", this.onClick, true);
    document.removeEventListener("keydown", this.onKeydown, true);
    this.host?.remove();
    this.host = null;
    this.highlight = null;
    this.target = null;
    this.selected.clear();
    this.resolveOne = null;
    this.resolveMany = null;
  }
}
