import type { RuntimeMessage } from "../messages";
import { ReaderController } from "./reader-controller";
import { waitForPageStability } from "./page-stability";

declare global {
  interface Window {
    __readEaseLoaded?: boolean;
  }
}

if (!window.__readEaseLoaded) {
  window.__readEaseLoaded = true;
  const controller = new ReaderController();
  chrome.runtime.onMessage.addListener(
    (message: RuntimeMessage | { type: "PING" }, _sender, sendResponse) => {
      if (message.type === "PING") {
        sendResponse({ ready: true });
      }
      if (message.type === "TOGGLE_READER") {
        void controller.toggle();
      }
      if (message.type === "AUTO_ENTER") {
        void waitForPageStability().then(() => controller.enter());
      }
      return false;
    },
  );

  const notifyUrlChange = (): void => {
    window.dispatchEvent(new Event("read-ease:url-change"));
  };
  for (const method of ["pushState", "replaceState"] as const) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      notifyUrlChange();
      return result;
    };
  }
  window.addEventListener("popstate", notifyUrlChange);
  window.addEventListener("read-ease:url-change", () => controller.onUrlChanged());
  void waitForPageStability().then(() => controller.maybeAutoEnter());
}
