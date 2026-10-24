import type { LookupCursor, TextCursor } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";

/** Where the lookup cursor lies in the subtitles: the cue's index, and the place in its text without markup. */
export type CueTextCursor = TextCursor & { cueIndex: number };

/**
 * The lookup cursor's place in the subtitles, with the length of text its highlight covers, as `selectCursorMatchedLength` gives it;
 * null when there is no cursor or it lies outside the subtitles.
 */
export function cuePositionOf(
  cursor: LookupCursor | null,
  matchedLength: number | null | undefined,
): CueTextCursor | null {
  const { source, occurrence } = cursor?.chosen ?? {};
  if (!cursor || source?.kind !== "cue" || !occurrence) return null;
  const place = { cueIndex: source.cue.index, start: occurrence.start };
  return matchedLength === undefined
    ? { ...place, input: cursor.input }
    : { ...place, input: cursor.input, matchedLength };
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
