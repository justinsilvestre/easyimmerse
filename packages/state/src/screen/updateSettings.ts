import type { AppAction } from "../app/appAction.ts";
import type { Route } from "../route/route.ts";
import type { ScreenState } from "./screenState.ts";

type SettingsState = ScreenState["settings"];

/** Keeps the state of Settings while the route shows them, and drops it once they close. */
export function updateSettings(
  settings: SettingsState,
  action: AppAction,
  route: Route,
): SettingsState {
  if (route.screen !== "settings") return null;
  switch (action.type) {
    case "dictionaryFileChosen":
      return { dictionaryImport: { stage: "fileChosen", file: action.file } };
    case "dictionaryFileHandled":
      return { dictionaryImport: null };
    default:
      return settings ?? { dictionaryImport: null };
  }
}
