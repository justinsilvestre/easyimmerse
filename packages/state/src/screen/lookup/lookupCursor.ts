import type { AppAction } from "../../app/appAction.ts";
import type { ChosenWord, LookupCursor, WordInput } from "./lookupState.ts";
import {
  reduceTextCursor,
  type TextCursor,
  type TextCursorAction,
} from "./textCursor.ts";

/** A change to the lookup cursor: pointing at a word, an input leaving the words, or the answer of a word's hover lookup. */
export type CursorMove =
  | Extract<AppAction, { type: "lookupCursorMoved" | "lookupCursorLeft" }>
  | {
      type: "answered";
      chosen: ChosenWord;
      input: WordInput;
      matchedLength: number | null;
    };

/**
 * Moves the cursor as `reduceTextCursor` moves a text's cursor, from one passage to another as well as within one.
 * A mouse moving within the highlight keeps the cursor and records the word under it in `pointed`.
 * A word with no place in a passage leaves the cursor as it is.
 */
export function moveCursor(
  cursor: LookupCursor | null,
  move: CursorMove,
): LookupCursor | null {
  if (move.type === "lookupCursorLeft")
    return cursor?.input === move.input ? null : cursor;
  const start = move.chosen.occurrence?.start;
  if (start === undefined) return cursor;
  const current = isInSamePassage(cursor, move.chosen) ? cursor : null;
  const shown = current && shownPlace(current, move);
  const place = reduceTextCursor(shown, textMoveOf(move, start));
  if (place === null) return null;
  if (current && place === shown) return withPointed(current, move.chosen);
  const { matchedLength } = place;
  const moved = {
    chosen: move.chosen,
    input: place.input,
    pointed: move.chosen,
  };
  return matchedLength === undefined ? moved : { ...moved, matchedLength };
}

type PlaceMove = Exclude<CursorMove, { type: "lookupCursorLeft" }>;

function isInSamePassage(
  cursor: LookupCursor | null,
  chosen: ChosenWord,
): cursor is LookupCursor {
  return cursor?.chosen.occurrence?.passage === chosen.occurrence?.passage;
}

/** The cursor's place as it is shown, with the match a pointing move says is shown when the cursor has none of its own. */
function shownPlace(cursor: LookupCursor, move: PlaceMove): TextCursor {
  const start = cursor.chosen.occurrence?.start ?? 0;
  const matchedLength =
    cursor.matchedLength === undefined && move.type === "lookupCursorMoved"
      ? move.shownMatchedLength
      : cursor.matchedLength;
  return matchedLength === undefined
    ? { start, input: cursor.input }
    : { start, input: cursor.input, matchedLength };
}

function textMoveOf(move: PlaceMove, start: number): TextCursorAction {
  return move.type === "lookupCursorMoved"
    ? { type: "pointed", start, input: move.input }
    : {
        type: "answered",
        start,
        input: move.input,
        matchedLength: move.matchedLength,
      };
}

function withPointed(cursor: LookupCursor, pointed: ChosenWord): LookupCursor {
  return cursor.pointed.occurrence?.start === pointed.occurrence?.start
    ? cursor
    : { ...cursor, pointed };
}
