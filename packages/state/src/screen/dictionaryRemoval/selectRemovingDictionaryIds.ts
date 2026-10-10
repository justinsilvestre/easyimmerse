import { createSelector } from "reselect";
import type { RootState } from "../../app/createAppStore.ts";

/** Selects the dictionaries whose removal is in flight. The result keeps its reference while that set is unchanged. */
export const selectRemovingDictionaryIds = createSelector(
  [(state: RootState) => state.app.operations.requests],
  (requests): readonly string[] =>
    requests.flatMap(({ request }) =>
      request.kind === "deleteDictionary" ? [request.dictionaryId] : [],
    ),
  { memoizeOptions: { resultEqualityCheck: haveSameItems } },
);

function haveSameItems(
  first: readonly string[],
  second: readonly string[],
): boolean {
  return (
    first.length === second.length &&
    first.every((item, index) => item === second[index])
  );
}
