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
  private resolve: ((result: SelectionResult | null) => void) | null = null;

  pickOne(instruction: string): Promise<SelectionResult | null> {
    this.stop();
    this.mount(instruction);
    document.addEventListener("mouseover", this.onHover, true);
    document.addEventListener("click", this.onClick, true);
    document.addEventListener("keydown", this.onKeydown, true);
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  cancel(): void {
    const resolve = this.resolve;
    this.stop();
    resolve?.(null);
  }

  private mount(instruction: string): void {
    this.host = document.createElement("div");
    this.host.dataset.readEaseSelector = "";
    const shadow = this.host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .hint { position:fixed; top:18px; left:50%; transform:translateX(-50%);
          z-index:2147483647; padding:10px 14px; border-radius:999px;
          color:#fff; background:#263224; box-shadow:0 8px 26px #0005;
          font:600 13px/1.2 ui-sans-serif,system-ui; }
        .highlight { position:fixed; z-index:2147483646; pointer-events:none;
          border:3px solid #6d9c58; background:#83bd6840; border-radius:4px; }
      </style>
      <div class="hint">${instruction} · Esc 取消</div>
      <div class="highlight"></div>`;
    this.highlight = shadow.querySelector(".highlight");
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
    const resolve = this.resolve;
    this.stop();
    resolve?.(result);
  };

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      this.cancel();
    }
  };

  private stop(): void {
    document.removeEventListener("mouseover", this.onHover, true);
    document.removeEventListener("click", this.onClick, true);
    document.removeEventListener("keydown", this.onKeydown, true);
    this.host?.remove();
    this.host = null;
    this.highlight = null;
    this.target = null;
    this.resolve = null;
  }
}

