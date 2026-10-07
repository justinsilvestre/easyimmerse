import { characterLength } from "./characterLength.ts";
import type { TextStep } from "./cursorKeys.ts";
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
   * It is unset until that lookup answers, and the cursor is highlighted only once it is set.
   */
  matchedLength?: number | null;
};

export type TextCursorAction =
  | { type: "pointed"; start: number; input: WordHit["input"] }
  | {
      type: "answered";
      start: number;
      input: WordHit["input"];
      matchedLength: number | null;
    }
  | { type: "left"; input: WordHit["input"] }
  | { type: "cleared" };

/**
 * Moves the cursor where the mouse or the keyboard points, and keeps the length its lookup matched once that answers.
 * A mouse that moves within the highlighted text leaves the cursor where it is, so that the highlight does not flicker.
 * The cursor goes once the input that placed it leaves the text, or when it is cleared, as when the text changes.
 */
export function reduceTextCursor(
  cursor: TextCursor | null,
  action: TextCursorAction,
): TextCursor | null {
  switch (action.type) {
    case "pointed":
      return keepsCursor(cursor, action)
        ? cursor
        : { start: action.start, input: action.input };
    case "answered":
      return {
        start: action.start,
        input: action.input,
        matchedLength: action.matchedLength,
      };
    case "left":
      return cursor?.input === action.input ? null : cursor;
    case "cleared":
      return null;
  }
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

/** A part of a text, as `splitIntoWords` finds it. */
type TextPart = {
  text: string;
  start: number;
  isWord: boolean;
  isUnspaced: boolean;
};

/**
 * Where the cursor lands from `offset` after one step along the text:
 * the next or previous word written with spaces, or character of a run written without them.
 * Punctuation and spaces hold no place, and at either end of the text the cursor stays.
 */
export function stepTextCursor(
  parts: readonly TextPart[],
  offset: number,
  step: TextStep,
): number {
  const places = parts.flatMap(cursorPlacesIn);
  const landing =
    step === "forward"
      ? places.find((place) => place > offset)
      : places.findLast((place) => place < offset);
  return landing ?? offset;
}

/** The offsets in the text where the cursor can lie within one part of it. */
function cursorPlacesIn(part: TextPart): number[] {
  if (!part.isWord) return [];
  if (!part.isUnspaced) return [part.start];
  const places: number[] = [];
  for (
    let offset = 0;
    offset < part.text.length;
    offset += characterLength(part.text, offset)
  )
    places.push(part.start + offset);
  return places;
}
