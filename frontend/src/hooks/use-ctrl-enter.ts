import { useEffect } from "react";

export function useCtrlEnter(handler: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && event.ctrlKey) {
        const target = event.target as HTMLElement | null;
        const isEditable =
          target?.matches("input, textarea") || target?.closest(".cm-editor");
        if (isEditable) {
          event.preventDefault();
          handler();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, handler]);
}
