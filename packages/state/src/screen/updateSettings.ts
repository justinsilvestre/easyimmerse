import type { AppAction } from "../app/appAction.ts";
import { combineUpdates } from "../app/combineUpdates.ts";
import { updated } from "../app/updated.ts";
import type { Route, SettingsPage } from "../route/route.ts";
import { settingsPageOf } from "../route/route.ts";
import { updateConversionCache } from "./conversionCache/updateConversionCache.ts";
import { stopWatching } from "./dictionaryImport/dictionaryImportRequests.ts";
import { updateDictionaryImport } from "./dictionaryImport/updateDictionaryImport.ts";
import type { ScreenState } from "./screenState.ts";

type OpenSettings = NonNullable<ScreenState["settings"]>;

const openedSettings: OpenSettings = {
  dictionaryImport: null,
  conversionCacheReport: null,
};

/**
 * Keeps the state of Settings while the route after the action shows them, and drops it once they close.
 * Each page's state lasts while that page is on top: the media cache's report on the general page,
 * and the dictionary import on the dictionaries page, whose job is no longer watched once the page goes.
 */
export function updateSettings(
  settings: ScreenState["settings"],
  action: AppAction,
  route: Route,
) {
  if (route.screen !== "settings")
    return updated(null, ...stopWatching(settings?.dictionaryImport ?? null));
  return updatePages(settings ?? openedSettings, action, settingsPageOf(route));
}

const updatePages = combineUpdates<OpenSettings, [SettingsPage]>({
  dictionaryImport: (dictionaryImport, action, page) =>
    page === "dictionaries"
      ? updateDictionaryImport(dictionaryImport, action)
      : updated(null, ...stopWatching(dictionaryImport)),
  conversionCacheReport: (report, action, page) =>
    page === "general" ? updateConversionCache(report, action) : updated(null),
});
