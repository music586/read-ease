import { afterEach } from "vitest";

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverMock;

afterEach(() => {
  document.body.replaceChildren();
  document.head.replaceChildren();
  localStorage.clear();
});
