import {
  type RootState,
  type SettingsPage,
  selectRoute,
} from "@easyimmerse/state";

const pageNames = {
  general: "Settings",
  account: "Account",
  dictionaries: "Dictionaries",
  pairing: "Local network sync",
  server: "Server",
  users: "Users",
  linkedRemoteUsers: "Users",
} satisfies Record<SettingsPage, string>;

/**
 * Names where a settings page's Back button leads: the settings page beneath it, such as "Settings" for the general settings,
 * and "Back" when it was opened directly over the main screen, to which Back returns.
 */
export function selectSettingsPageBackLabel(state: RootState): string {
  const route = selectRoute(state);
  const beneath =
    route.screen === "settings" ? route.pages[route.pages.length - 2] : null;
  return beneath ? pageNames[beneath] : "Back";
}
