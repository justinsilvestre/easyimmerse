import type { AppAction } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import type { Route } from "../route/route.ts";
import { settingsPageOf } from "../route/route.ts";
import { removeDictionary } from "./dictionaries/dictionaryRemoval.ts";
import { stopWatching } from "./dictionaryImport/dictionaryImportRequests.ts";
import { updateDictionaryImport } from "./dictionaryImport/updateDictionaryImport.ts";
import type { ScreenState } from "./screenState.ts";

type SettingsState = ScreenState["settings"];

/**
 * Keeps the state of Settings while the route shows them, and drops it once they close.
 * The dictionary import lasts while the dictionaries page is on top; when the page goes, its job is no longer watched.
 * A dictionary whose removal is confirmed there is removed.
 */
export function updateSettings(
  settings: SettingsState,
  action: AppAction,
  route: Route,
): readonly [SettingsState, readonly Effect[]] {
  const dictionaryImport = settings?.dictionaryImport ?? null;
  if (route.screen !== "settings")
    return [null, stopWatching(dictionaryImport)];
  if (settingsPageOf(route) !== "dictionaries")
    return [
      dictionaryImport === null && settings !== null
        ? settings
        : { dictionaryImport: null },
      stopWatching(dictionaryImport),
    ];
  const [next, effects] = updateDictionaryImport(dictionaryImport, action);
  return [
    next === dictionaryImport && settings !== null
      ? settings
      : { dictionaryImport: next },
    action.type === "dictionaryRemovalConfirmed"
      ? [...effects, removeDictionary(action.dictionaryId)]
      : effects,
  ];
}
