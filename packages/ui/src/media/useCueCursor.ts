import { selectCachedLookup } from "@easyimmerse/backend";
import type { RootState } from "@easyimmerse/state";
import type { Cue, LookupQuery } from "@easyimmerse/types";
import { useMemo, useReducer } from "react";
import type { WordHit } from "../components/useWordGestures.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import {
  type CueCursor,
  type CueTextCursor,
  reduceCueCursor,
} from "./cueCursor.ts";

/**
 * The one lookup cursor of the subtitles, which the mouse and the keyboard move alike, with its place as it is shown:
 * highlighted at once when its word's lookup is cached, and otherwise once the hover lookup answers.
 * `queryAt` gives what a lookup from a hit sends, or null when nothing is looked up.
 * To do in step 10a: this view state is held in a `useReducer`, which the sweep is to judge.
 */
export function useCueCursor(
  queryAt: (hit: WordHit, cue: Cue) => LookupQuery | null,
) {
  const [cursor, dispatch] = useReducer(reduceCueCursor, null);
  const cachedMatch = useCachedMatchLength(
    cursor ? queryAt(cursor.hit, cursor.cue) : undefined,
  );
  const position = useShownCursor(cursor, cachedMatch);
  return {
    cursor,
    position,
    point: (hit: WordHit | null, input: WordHit["input"], cue: Cue) =>
      dispatch(
        hit
          ? {
              type: "pointed",
              cue,
              hit,
              shownMatchedLength: position?.matchedLength,
            }
          : { type: "left", input },
      ),
    answer: (hit: WordHit, matchedLength: number | null, cue: Cue) =>
      dispatch({ type: "answered", cue, hit, matchedLength }),
  };
}

/**
 * The length of the text that a word's lookup matched, when its answer is cached: null when it matched nothing or there is nothing to look up,
 * and undefined when the word has yet to be looked up or there is no word. It renders again only when that length changes.
 */
function useCachedMatchLength(
  query: LookupQuery | null | undefined,
): number | null | undefined {
  return useAppSelector((state: RootState) => {
    if (query === undefined) return undefined;
    if (query === null) return null;
    const results = selectCachedLookup(state, query)?.results;
    return results && (results[0]?.matchedText.length ?? null);
  });
}

/** The cursor's place, with the length its word's cached lookup matched until the cursor's own lookup has answered. */
function useShownCursor(
  cursor: CueCursor | null,
  cachedMatch: number | null | undefined,
): CueTextCursor | null {
  const position = cursor?.position ?? null;
  return useMemo(
    () =>
      position === null ||
      position.matchedLength !== undefined ||
      cachedMatch === undefined
        ? position
        : { ...position, matchedLength: cachedMatch },
    [position, cachedMatch],
  );
}
