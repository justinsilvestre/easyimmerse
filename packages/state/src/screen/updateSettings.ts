import type { AppAction } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import type { Route } from "../route/route.ts";
import { settingsPageOf } from "../route/route.ts";
import { updateConversionCache } from "./conversionCache/updateConversionCache.ts";
import { removeDictionary } from "./dictionaries/dictionaryRemoval.ts";
import { stopWatching } from "./dictionaryImport/dictionaryImportRequests.ts";
import { updateDictionaryImport } from "./dictionaryImport/updateDictionaryImport.ts";
import type { ScreenState } from "./screenState.ts";

type SettingsState = ScreenState["settings"];

/**
 * Keeps the state of Settings while the route shows them, and drops it once they close.
 * Each page's state lasts while that page is on top: the media cache's report on the general page,
 * and the dictionary import on the dictionaries page, whose job is no longer watched once the page goes.
 * A dictionary whose removal is confirmed on the dictionaries page is removed.
 */
export function updateSettings(
  settings: SettingsState,
  action: AppAction,
  route: Route,
): readonly [SettingsState, readonly Effect[]] {
  const dictionaryImport = settings?.dictionaryImport ?? null;
  if (route.screen !== "settings")
    return [null, stopWatching(dictionaryImport)];
  const page = settingsPageOf(route);
  const [nextImport, importEffects] =
    page === "dictionaries"
      ? updateDictionaryImport(dictionaryImport, action)
      : [null, stopWatching(dictionaryImport)];
  const [report, cacheEffects] =
    page === "general"
      ? updateConversionCache(settings?.conversionCacheReport ?? null, action)
      : [null, []];
  const removalEffects =
    page === "dictionaries" && action.type === "dictionaryRemovalConfirmed"
      ? [removeDictionary(action.dictionaryId)]
      : [];
  const isUnchanged =
    settings !== null &&
    nextImport === settings.dictionaryImport &&
    report === settings.conversionCacheReport;
  return [
    isUnchanged
      ? settings
      : { dictionaryImport: nextImport, conversionCacheReport: report },
    [...importEffects, ...removalEffects, ...cacheEffects],
  ];
}
