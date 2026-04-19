import { useEffect } from "react";

type Modifier = "meta" | "ctrl" | "alt";
type KeyCombo = [...Modifier[], string];

/**
 * Registers a keyboard shortcut.
 * combo e.g. ["ctrl", "k"] or ["meta", "k"].
 * Automatically cleaned up on unmount / dependency change.
 */
export function useHotkey(
  combo: KeyCombo,
  callback: (e: KeyboardEvent) => void,
  opts: { enabled?: boolean } = {},
) {
  const { enabled = true } = opts;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const wantsMeta = combo.includes("meta");
      const wantsCtrl = combo.includes("ctrl");
      const key = combo[combo.length - 1];

      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      if (wantsMeta && !e.metaKey) return;
      if (wantsCtrl && !e.ctrlKey) return;

      e.preventDefault();
      callback(e);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [combo.join("+"), callback, enabled]);
}
