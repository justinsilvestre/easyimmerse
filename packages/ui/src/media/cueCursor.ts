import type { Cue } from "@easyimmerse/types";
import {
  reduceTextCursor,
  type TextCursor,
  type TextCursorAction,
} from "../components/textCursor.ts";
import type { WordHit } from "../components/useWordGestures.ts";

/** Where the lookup cursor lies in the subtitles: the cue's index, and the place in its text without markup. */
export type CueTextCursor = TextCursor & { cueIndex: number };

/**
 * The one lookup cursor of the subtitles, wherever they are shown: the cue it lies in,
 * the hit a lookup from it starts with, and its place in the cue's text.
 */
export type CueCursor = { cue: Cue; hit: WordHit; position: CueTextCursor };

export type CueCursorAction =
  | { type: "pointed"; cue: Cue; hit: WordHit }
  | { type: "answered"; cue: Cue; hit: WordHit; matchedLength: number | null }
  | { type: "left"; input: WordHit["input"] };

/** Moves the cursor of the subtitles as `reduceTextCursor` moves a text's cursor, from one cue to another as well as within one. */
export function reduceCueCursor(
  cursor: CueCursor | null,
  action: CueCursorAction,
): CueCursor | null {
  if (action.type === "left")
    return cursor?.position.input === action.input ? null : cursor;
  const current = cursor?.cue.index === action.cue.index ? cursor : null;
  const position = reduceTextCursor(
    current?.position ?? null,
    textActionOf(action),
  );
  if (position === null) return null;
  if (current && position === current.position) return current;
  return {
    cue: action.cue,
    hit: action.hit,
    position: { ...position, cueIndex: action.cue.index },
  };
}

function textActionOf(
  action: Exclude<CueCursorAction, { type: "left" }>,
): TextCursorAction {
  const { start, input } = action.hit;
  return action.type === "pointed"
    ? { type: "pointed", start, input }
    : { type: "answered", start, input, matchedLength: action.matchedLength };
}

/**
 * The cursor within one cue's text, or null when it lies in another cue or nowhere,
 * as `ClickableText` takes it; undefined, without a cursor to place, leaves each text to keep its own.
 */
export function cursorIn(
  cursor: CueTextCursor | null | undefined,
  cue: Cue,
): CueTextCursor | null | undefined {
  if (cursor === undefined) return undefined;
  return cursor?.cueIndex === cue.index ? cursor : null;
}
