import { lookUpTextAhead } from "@easyimmerse/backend";
import type { AppDispatch } from "@easyimmerse/state";
import type { LookupQuery } from "@easyimmerse/types";

/**
 * Looks a hovered word up ahead of a click, and resolves to the length of the text its best result matched,
 * or null when nothing matched, the lookup failed, or there is nothing to look up.
 * The word gestures wait for this promise; step 10a is to judge that protocol.
 */
export function hoverMatchLength(
  dispatch: AppDispatch,
  query: LookupQuery | null,
): Promise<number | null> {
  if (query === null) return Promise.resolve(null);
  return lookUpTextAhead(dispatch, query).then(
    (response) => response.results[0]?.matchedText.length ?? null,
    () => null,
  );
}
