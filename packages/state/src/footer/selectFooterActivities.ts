import { createSelector } from "reselect";
import type { RootState } from "../app/createAppStore.ts";
import { haveSameItems } from "../app/haveSameItems.ts";
import { selectDictionaryImportActivity } from "../dictionaryImport/selectDictionaryImportActivity.ts";
import { isAlreadyAt } from "../route/route.ts";
import { selectMediaFetchActivities } from "../screen/projectScreen/selectMediaFetchActivities.ts";
import type { FooterActivity } from "./footerActivity.ts";

/**
 * Selects the activities the footer shows, from each feature's own, leaving out those whose place is on top, since the place shows them itself.
 * The result keeps its reference while the activities it lists stay the same.
 */
export const selectFooterActivities = createSelector(
  [
    selectDictionaryImportActivity,
    selectMediaFetchActivities,
    (root: RootState) => root.app.route,
  ],
  (dictionaryImport, mediaFetches, route): readonly FooterActivity[] =>
    [dictionaryImport, ...mediaFetches].filter(
      (activity): activity is FooterActivity =>
        activity !== null && !isAlreadyAt(route, activity.opens.step),
    ),
  { memoizeOptions: { resultEqualityCheck: haveSameItems } },
);
