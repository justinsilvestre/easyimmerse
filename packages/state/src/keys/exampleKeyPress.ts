import type { KeyPress } from "./keyBinding.ts";

/** A key pressed on the page with no modifier held, no element handling it and no dialog open, unless `facts` say otherwise. */
export function exampleKeyPress(
  key: string,
  facts: Partial<Omit<KeyPress, "key">> = {},
): KeyPress {
  return {
    key,
    isShifted: false,
    hasCommandKey: false,
    hasAltKey: false,
    focus: "page",
    isDialogOpen: false,
    isHandled: false,
    ...facts,
  };
}
