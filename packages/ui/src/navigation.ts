export type Navigation =
  | { screen: "home" }
  | { screen: "media"; projectId: string };

export type NavigationAction =
  | { type: "openProject"; projectId: string }
  | { type: "goHome" };

export const initialNavigation: Navigation = { screen: "home" };

export function navigate(
  _current: Navigation,
  action: NavigationAction,
): Navigation {
  switch (action.type) {
    case "openProject":
      return { screen: "media", projectId: action.projectId };
    case "goHome":
      return { screen: "home" };
  }
}
