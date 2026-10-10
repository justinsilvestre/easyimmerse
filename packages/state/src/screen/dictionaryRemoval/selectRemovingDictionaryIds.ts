import { createSelector } from "reselect";
import type { RootState } from "../../app/createAppStore.ts";
import { haveSameItems } from "../../app/haveSameItems.ts";

/** Selects the dictionaries whose removal is in flight. The result keeps its reference while that set is unchanged. */
export const selectRemovingDictionaryIds = createSelector(
  [(state: RootState) => state.app.operations.requests],
  (requests): readonly string[] =>
    requests.flatMap(({ request }) =>
      request.kind === "deleteDictionary" ? [request.dictionaryId] : [],
    ),
  { memoizeOptions: { resultEqualityCheck: haveSameItems } },
);
