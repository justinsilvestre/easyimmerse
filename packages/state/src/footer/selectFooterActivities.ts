import { createSelector } from "reselect";
import type { RootState } from "../app/createAppStore.ts";
import { haveSameItems } from "../app/haveSameItems.ts";
import { selectDictionaryImportActivity } from "../dictionaryImport/selectDictionaryImportActivity.ts";
import { selectPendingSavesActivity } from "../flashcards/selectPendingSavesActivity.ts";
import { selectMediaFetchActivities } from "../mediaImports/selectMediaFetchActivities.ts";
import { isAlreadyAt } from "../route/route.ts";
import type { FooterActivity } from "./footerActivity.ts";

/**
 * Selects the activities the footer shows, from each feature's own, leaving out those whose place is on top, since the place shows them itself.
 * The result keeps its reference while the activities it lists stay the same.
 */
export const selectFooterActivities = createSelector(
  [
    selectDictionaryImportActivity,
    selectMediaFetchActivities,
    selectPendingSavesActivity,
    (root: RootState) => root.app.route,
  ],
  (
    dictionaryImport,
    mediaFetches,
    pendingSaves,
    route,
  ): readonly FooterActivity[] =>
    [dictionaryImport, ...mediaFetches, pendingSaves].filter(
      (activity): activity is FooterActivity =>
        activity !== null &&
        (activity.opens === null || !isAlreadyAt(route, activity.opens.step)),
    ),
  { memoizeOptions: { resultEqualityCheck: haveSameItems } },
);
