import { createContext, useContext } from "react";

/** The navigation steps any screen may take, such as opening Settings from the footer or the dictionaries from the pop-up. */
export type NavigationActions = {
  openSettings: () => void;
  /** Opens the dictionaries settings, over the current screen. */
  openDictionaries: () => void;
  /** Opens a media file of a project on its media screen, from wherever the app is. */
  openMediaFile: (projectId: string, mediaFileId: string) => void;
};

const inactiveNavigationActions: NavigationActions = {
  openSettings: () => undefined,
  openDictionaries: () => undefined,
  openMediaFile: () => undefined,
};

/** Provided by the app root. Outside it, as in a component test, the actions do nothing. */
export const NavigationActionsContext = createContext<NavigationActions>(
  inactiveNavigationActions,
);

export function useNavigationActions(): NavigationActions {
  return useContext(NavigationActionsContext);
}

/** Whether Settings lies over the screen, in which case the footer's Settings control stands for the page already open. */
export const SettingsOpenContext = createContext(false);

export function useIsSettingsOpen(): boolean {
  return useContext(SettingsOpenContext);
}
