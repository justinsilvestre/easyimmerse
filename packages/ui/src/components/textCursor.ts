import type { WordHit } from "./useWordGestures.ts";

/**
 * The lookup cursor within a text: what a lookup by the L key, or by Enter on the focused word, starts from.
 * The mouse and the keyboard move the same cursor, to the same places:
 * the start of a word written with spaces, or a character of a run written without them.
 */
export type TextCursor = {
  /** The offset the cursor points at, in UTF-16 code units. */
  start: number;
  /** What placed the cursor, which alone can take it away again. */
  input: WordHit["input"];
  /**
   * How much of the text the lookup from `start` matched, or null when it matched nothing.
   * It is unset until that lookup's answer is known, from the cache at once or when the lookup answers; meanwhile nothing is highlighted.
   */
  matchedLength?: number | null;
};

export type TextCursorAction =
  | {
      type: "pointed";
      start: number;
      input: WordHit["input"];
      /** The length a cached lookup from `start` matched, or null when it matched nothing; unset when no answer is cached. */
      matchedLength?: number | null;
    }
  | {
      type: "answered";
      start: number;
      input: WordHit["input"];
      matchedLength: number | null;
    }
  | { type: "left"; input: WordHit["input"] }
  | { type: "cleared" };

/**
 * Moves the cursor where the mouse or the keyboard points, and keeps the length its lookup matched,
 * at once when the pointing brings a cached answer, or once the lookup answers.
 * A mouse that moves within the highlighted text leaves the cursor where it is, so that the highlight does not flicker.
 * The cursor goes once the input that placed it leaves the text, or when it is cleared, as when the text changes.
 */
export function reduceTextCursor(
  cursor: TextCursor | null,
  action: TextCursorAction,
): TextCursor | null {
  switch (action.type) {
    case "pointed":
      return keepsCursor(cursor, action) ? cursor : cursorOf(action);
    case "answered":
      return isSameCursor(cursor, action) ? cursor : cursorOf(action);
    case "left":
      return cursor?.input === action.input ? null : cursor;
    case "cleared":
      return null;
  }
}

function cursorOf({ start, input, matchedLength }: TextCursor): TextCursor {
  return matchedLength === undefined
    ? { start, input }
    : { start, input, matchedLength };
}

function isSameCursor(cursor: TextCursor | null, other: TextCursor): boolean {
  return (
    cursor?.start === other.start &&
    cursor.input === other.input &&
    cursor.matchedLength === other.matchedLength
  );
}

function keepsCursor(
  cursor: TextCursor | null,
  pointed: { start: number; input: WordHit["input"] },
): cursor is TextCursor {
  if (cursor === null || cursor.input !== pointed.input) return false;
  if (cursor.start === pointed.start) return true;
  if (pointed.input !== "mouse" || cursor.matchedLength === undefined)
    return false;
  const end = cursor.start + (cursor.matchedLength ?? 1);
  return pointed.start >= cursor.start && pointed.start < end;
}
