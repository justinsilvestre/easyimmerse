import type { Action } from "redux";
import type { PlatformAction } from "../platform/platformActions.ts";
import { platformActions } from "../platform/platformActions.ts";
import type { PreferencesAction } from "../preferences/preferencesActions.ts";
import { preferencesActions } from "../preferences/preferencesActions.ts";
import type { RouteAction } from "../route/routeActions.ts";
import { routeActions } from "../route/routeActions.ts";
import type { ScreenAction } from "../screen/screenActions.ts";
import { screenActions } from "../screen/screenActions.ts";
import type { StoredPlacesAction } from "../storedPlaces/storedPlacesActions.ts";
import { storedPlacesActions } from "../storedPlaces/storedPlacesActions.ts";
import type { UnsavedWorkAction } from "../unsavedWork/unsavedWork.ts";
import { unsavedWorkActions } from "../unsavedWork/unsavedWork.ts";

/** Every feature's action creators, in one object. */
export const actions = {
  ...routeActions,
  ...screenActions,
  ...preferencesActions,
  ...storedPlacesActions,
  ...unsavedWorkActions,
  ...platformActions,
};

export type AppAction =
  | RouteAction
  | ScreenAction
  | PreferencesAction
  | StoredPlacesAction
  | UnsavedWorkAction
  | PlatformAction;

/** The action creators of each feature, as spread into `actions`. A type-level test checks that no two declare the same action type. */
export type FeatureActionCreators = [
  typeof routeActions,
  typeof screenActions,
  typeof preferencesActions,
  typeof storedPlacesActions,
  typeof unsavedWorkActions,
  typeof platformActions,
];

/** Tells whether a Redux action is one of the app's own, as opposed to one from Redux itself or from another slice. */
export function isAppAction(action: Action): action is AppAction {
  return Object.hasOwn(actions, action.type);
}
