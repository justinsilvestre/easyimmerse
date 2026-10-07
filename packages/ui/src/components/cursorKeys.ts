/** Which way the lookup cursor moves along a line of text: on in the reading direction, or back. */
export type TextStep = "forward" | "backward";

/** Which way the lookup cursor moves between lines of text, such as subtitle cues. */
export type LineStep = "previous" | "next";

type ArrowKeyEvent = {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

/**
 * The step along the text that an arrow key asks for, or null for any other key.
 * Right moves forward and Left backward, as suits scripts written from left to right;
 * right-to-left scripts such as Arabic or Hebrew will need the opposite mapping.
 */
export function textStepOfKey(event: ArrowKeyEvent): TextStep | null {
  if (hasModifier(event)) return null;
  if (event.key === "ArrowRight") return "forward";
  if (event.key === "ArrowLeft") return "backward";
  return null;
}

/** The step between lines that an arrow key asks for: Up to the previous line, Down to the next, or null for any other key. */
export function lineStepOfKey(event: ArrowKeyEvent): LineStep | null {
  if (hasModifier(event)) return null;
  if (event.key === "ArrowUp") return "previous";
  if (event.key === "ArrowDown") return "next";
  return null;
}

/** Shift with an arrow extends a selection, and the other modifiers belong to the system and the browser. */
function hasModifier(event: ArrowKeyEvent): boolean {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}
