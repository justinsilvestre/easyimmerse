import { createContext, useContext } from "react";

/** The navigation steps any screen may take, such as opening Settings from the footer. */
export type NavigationActions = {
  openSettings: () => void;
};

const inactiveNavigationActions: NavigationActions = {
  openSettings: () => undefined,
};

/** Provided by the app root. Outside it, as in a component test, the actions do nothing. */
export const NavigationActionsContext = createContext<NavigationActions>(
  inactiveNavigationActions,
);

export function useNavigationActions(): NavigationActions {
  return useContext(NavigationActionsContext);
}
