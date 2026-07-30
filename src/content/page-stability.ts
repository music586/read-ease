export function waitForPageStability({
  quietMs = 300,
  timeoutMs = 3000,
}: {
  quietMs?: number;
  timeoutMs?: number;
} = {}): Promise<"stable" | "timeout"> {
  return new Promise((resolve) => {
    let settled = false;
    let quietTimer = window.setTimeout(finishStable, quietMs);
    const timeout = window.setTimeout(() => finish("timeout"), timeoutMs);
    const observer = new MutationObserver(() => {
      window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(finishStable, quietMs);
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    function finishStable(): void {
      finish("stable");
    }
    function finish(result: "stable" | "timeout"): void {
      if (settled) return;
      settled = true;
      observer.disconnect();
      window.clearTimeout(quietTimer);
      window.clearTimeout(timeout);
      resolve(result);
    }
  });
}

