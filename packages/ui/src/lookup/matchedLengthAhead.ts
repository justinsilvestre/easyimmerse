import { lookUpTextAhead } from "@easyimmerse/backend";
import type { AppDispatch } from "@easyimmerse/state";
import type { LookupQuery } from "@easyimmerse/types";

/**
 * Looks text up ahead of a click, as the keyboard does when it steps back over a run to find where its words begin,
 * and resolves to the length of the text its best result matched, or null when nothing matched or the lookup failed.
 * Returns null at once when there is nothing to look up.
 */
export function matchedLengthAhead(
  dispatch: AppDispatch,
  query: LookupQuery | null,
): Promise<number | null> | null {
  if (query === null) return null;
  return lookUpTextAhead(dispatch, query).then(
    (response) => response.results[0]?.matchedText.length ?? null,
    () => null,
  );
}
