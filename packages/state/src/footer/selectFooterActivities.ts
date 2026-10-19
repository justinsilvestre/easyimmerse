import { createSelector } from "reselect";
import type { AppRoot } from "../app/createAppStore.ts";
import { haveSameItems } from "../app/haveSameItems.ts";
import { selectDictionaryImportActivity } from "../dictionaryImport/selectDictionaryImportActivity.ts";
import { isAlreadyAt } from "../route/route.ts";
import type { FooterActivity } from "./footerActivity.ts";

/**
 * Selects the activities the footer shows, from each feature's own, leaving out those whose place is on top, since the place shows them itself.
 * The result keeps its reference while the activities it lists stay the same.
 */
export const selectFooterActivities = createSelector(
  [selectDictionaryImportActivity, (state: AppRoot) => state.app.route],
  (dictionaryImport, route): readonly FooterActivity[] =>
    [dictionaryImport].filter(
      (activity): activity is FooterActivity =>
        activity !== null && !isAlreadyAt(route, activity.opens.step),
    ),
  { memoizeOptions: { resultEqualityCheck: haveSameItems } },
);
