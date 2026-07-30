export type FailureAction =
  | "retry"
  | "select-content"
  | "advanced-rule"
  | "cancel";

export function showErrorNotice(
  onAction: (action: FailureAction) => void,
): () => void {
  document.querySelector("[data-read-ease-error]")?.remove();
  const host = document.createElement("div");
  host.dataset.readEaseError = "";
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    .notice { position:fixed; z-index:2147483647; top:18px; right:18px; width:310px;
      padding:18px; border-radius:14px; color:#292725; background:#fffdf8;
      box-shadow:0 16px 50px #0004; font:14px/1.5 ui-sans-serif,system-ui; }
    h2 { margin:0 0 6px; font-size:16px; } p { margin:0 0 14px; color:#6f6962; }
    .actions { display:flex; flex-wrap:wrap; gap:8px; }
    button { border:0; border-radius:8px; padding:8px 10px; cursor:pointer; background:#eee9df; }
    button.primary { color:white; background:#53634a; }
  `;
  const notice = document.createElement("div");
  notice.className = "notice";
  notice.innerHTML = `
    <h2>未能识别正文</h2>
    <p>原网页没有被修改。你可以重试或手动选择正文区域。</p>
    <div class="actions">
      <button class="primary" data-action="select-content">选择正文</button>
      <button data-action="retry">重试</button>
      <button data-action="advanced-rule">高级规则</button>
      <button data-action="cancel">取消</button>
    </div>`;
  notice.addEventListener("click", (event) => {
    const target = (event.target as Element).closest<HTMLButtonElement>("[data-action]");
    if (!target) return;
    const action = target.dataset.action as FailureAction;
    host.remove();
    onAction(action);
  });
  shadow.append(style, notice);
  document.documentElement.append(host);
  return () => host.remove();
}

