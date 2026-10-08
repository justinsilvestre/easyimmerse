/** Which way the lookup cursor moves along a line of text: on in the reading direction, or back. */
export type TextDirection = "forward" | "backward";

/**
 * How far the lookup cursor moves along a line of text: by a word,
 * or by a character within a run of a script written without spaces, whose every character can begin a word.
 */
export type TextUnit = "word" | "character";

export type TextStep = { direction: TextDirection; unit: TextUnit };

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
 * An arrow moves by a word, and with Shift by a character.
 */
export function textStepOfKey(event: ArrowKeyEvent): TextStep | null {
  if (hasSystemModifier(event)) return null;
  const unit = event.shiftKey ? "character" : "word";
  if (event.key === "ArrowRight") return { direction: "forward", unit };
  if (event.key === "ArrowLeft") return { direction: "backward", unit };
  return null;
}

/** The step between lines that an arrow key asks for: Up to the previous line, Down to the next, or null for any other key. */
export function lineStepOfKey(event: ArrowKeyEvent): LineStep | null {
  if (hasSystemModifier(event) || event.shiftKey) return null;
  if (event.key === "ArrowUp") return "previous";
  if (event.key === "ArrowDown") return "next";
  return null;
}

/** Alt, Control and Meta with an arrow belong to the system and the browser. */
function hasSystemModifier(event: ArrowKeyEvent): boolean {
  return event.altKey || event.ctrlKey || event.metaKey;
}
