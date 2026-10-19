import type { AppAction } from "../app/appAction.ts";
import { combineUpdates } from "../app/combineUpdates.ts";
import { updated } from "../app/updated.ts";
import type { Route, SettingsPage } from "../route/route.ts";
import { settingsPageOf } from "../route/route.ts";
import { updateConversionCache } from "./conversionCache/updateConversionCache.ts";
import type { ScreenState } from "./screenState.ts";

type OpenSettings = NonNullable<ScreenState["settings"]>;

const openedSettings: OpenSettings = { conversionCacheReport: null };

/**
 * Keeps the state of Settings while the route after the action shows them, and drops it once they close.
 * Each page's state lasts while that page is on top, as the media cache's report does on the general page.
 */
export function updateSettings(
  settings: ScreenState["settings"],
  action: AppAction,
  route: Route,
) {
  if (route.screen !== "settings") return updated(null);
  return updatePages(settings ?? openedSettings, action, settingsPageOf(route));
}

const updatePages = combineUpdates<OpenSettings, [SettingsPage]>({
  conversionCacheReport: (report, action, page) =>
    page === "general" ? updateConversionCache(report, action) : updated(null),
});
