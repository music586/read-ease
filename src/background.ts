import type { RuntimeMessage } from "./messages";

function scriptId(origin: string): string {
  return `read-ease-${new URL(origin).hostname.replace(/[^a-z0-9_]/gi, "-")}`;
}

async function enableAutoEnter(origin: string): Promise<boolean> {
  const pattern = `${new URL(origin).origin}/*`;
  const granted = await chrome.permissions.request({ origins: [pattern] });
  if (!granted) return false;
  const id = scriptId(origin);
  await chrome.scripting.unregisterContentScripts({ ids: [id] }).catch(() => {});
  await chrome.scripting.registerContentScripts([
    {
      id,
      matches: [pattern],
      js: ["content.js"],
      runAt: "document_idle",
      persistAcrossSessions: true,
    },
  ]);
  return true;
}

async function disableAutoEnter(origin: string): Promise<void> {
  await chrome.scripting
    .unregisterContentScripts({ ids: [scriptId(origin)] })
    .catch(() => {});
  await chrome.permissions.remove({
    origins: [`${new URL(origin).origin}/*`],
  });
}

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "PING" });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
  }
}

async function toggleInTab(tab: chrome.tabs.Tab): Promise<void> {
  if (tab.id === undefined || !tab.url?.match(/^https?:/)) return;
  await ensureContentScript(tab.id);
  const message: RuntimeMessage = { type: "TOGGLE_READER" };
  await chrome.tabs.sendMessage(tab.id, message);
}

chrome.action.onClicked.addListener((tab) => {
  void toggleInTab(tab);
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== "toggle-reader") return;
  void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    if (tab) return toggleInTab(tab);
  });
});

chrome.runtime.onMessage.addListener(
  (
    message: RuntimeMessage,
    _sender,
    sendResponse: (response: { ok: boolean }) => void,
  ) => {
    if (message.type === "ENABLE_AUTO_ENTER") {
      void enableAutoEnter(message.origin).then((ok) => sendResponse({ ok }));
      return true;
    }
    if (message.type === "DISABLE_AUTO_ENTER") {
      void disableAutoEnter(message.origin).then(() => sendResponse({ ok: true }));
      return true;
    }
    return false;
  },
);

