export type RuntimeMessage =
  | { type: "TOGGLE_READER" }
  | { type: "AUTO_ENTER" }
  | { type: "ENABLE_AUTO_ENTER"; origin: string }
  | { type: "DISABLE_AUTO_ENTER"; origin: string };

