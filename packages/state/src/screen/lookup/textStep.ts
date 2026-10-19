/** Which way the lookup cursor moves along a text: on in the reading direction, or back. */
export type TextDirection = "forward" | "backward";

/**
 * How far the lookup cursor moves along a text: by a word,
 * or by a character within a run of a script written without spaces, whose every character can begin a word.
 */
export type TextUnit = "word" | "character";

/** One step of the lookup cursor along a text, as the arrow keys ask for it. */
export type TextStep = { direction: TextDirection; unit: TextUnit };

/** One step of the lookup cursor through a book's text: along it as `TextStep`, or by a sentence, as Up and Down ask for it. */
export type ReaderCursorStep = {
  direction: TextDirection;
  unit: TextUnit | "sentence";
};
