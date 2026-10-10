import { selectCachedLookup } from "@easyimmerse/backend";
import { type RootState, selectLookupCursor } from "@easyimmerse/state";

/**
 * The length of the text the lookup cursor's highlight covers: the cursor's own once its hover lookup has answered,
 * and otherwise its word's cached answer, so that a cached word is highlighted in the moment the cursor arrives.
 * Null when nothing matched or nothing is looked up; undefined while it is unknown or there is no cursor.
 * It is a number, so that a component reading it renders again only when the length changes.
 */
export function selectCursorMatchedLength(
  state: RootState,
): number | null | undefined {
  const cursor = selectLookupCursor(state.app);
  if (cursor === null) return undefined;
  if (cursor.matchedLength !== undefined) return cursor.matchedLength;
  const { query } = cursor.chosen.word;
  if (query === null) return null;
  const results = selectCachedLookup(state, query)?.results;
  return results && (results[0]?.matchedText.length ?? null);
}
