import { type RootState, selectRoute } from "@easyimmerse/state";

/**
 * Names where a settings page's Back button leads: "Settings" when the page was opened from the general settings,
 * and "Back" when it was opened directly over the main screen, to which Back returns.
 */
export function selectSettingsPageBackLabel(state: RootState): string {
  const route = selectRoute(state);
  return route.screen === "settings" && route.pages.length > 1
    ? "Settings"
    : "Back";
}
