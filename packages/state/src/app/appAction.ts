import type { Action } from "redux";
import type { NoticesAction } from "../notices/noticesActions.ts";
import { noticesActions } from "../notices/noticesActions.ts";
import type { OperationsAction } from "../operations/operationsActions.ts";
import { operationsActions } from "../operations/operationsActions.ts";
import type { PlatformAction } from "../platform/platformActions.ts";
import { platformActions } from "../platform/platformActions.ts";
import type { PreferencesAction } from "../preferences/preferencesActions.ts";
import { preferencesActions } from "../preferences/preferencesActions.ts";
import type { RouteAction } from "../route/routeActions.ts";
import { routeActions } from "../route/routeActions.ts";
import type { LookupAction } from "../screen/lookup/lookupActions.ts";
import { lookupActions } from "../screen/lookup/lookupActions.ts";
import type { ScreenAction } from "../screen/screenActions.ts";
import { screenActions } from "../screen/screenActions.ts";
import type { SettingsAction } from "../screen/settingsActions.ts";
import { settingsActions } from "../screen/settingsActions.ts";
import type { ServerAction } from "../server/serverActions.ts";
import { serverActions } from "../server/serverActions.ts";
import type { StoredPlacesAction } from "../storedPlaces/storedPlacesActions.ts";
import { storedPlacesActions } from "../storedPlaces/storedPlacesActions.ts";
import type { UnsavedWorkAction } from "../unsavedWork/unsavedWork.ts";
import { unsavedWorkActions } from "../unsavedWork/unsavedWork.ts";
import type { StartupAction } from "./startupActions.ts";
import { startupActions } from "./startupActions.ts";

const featureActionCreators = [
  startupActions,
  routeActions,
  screenActions,
  settingsActions,
  lookupActions,
  preferencesActions,
  storedPlacesActions,
  unsavedWorkActions,
  platformActions,
  serverActions,
  noticesActions,
  operationsActions,
] as const;

/** The action creators of each feature. A type-level test checks that no two declare the same action type. */
export type FeatureActionCreators = typeof featureActionCreators;

type Merged<T extends readonly object[]> = T extends readonly [
  infer Head,
  ...infer Rest extends readonly object[],
]
  ? Head & Merged<Rest>
  : unknown;

/** Every feature's action creators, in one object. */
export const actions = Object.assign(
  {},
  ...featureActionCreators,
) as Merged<FeatureActionCreators>;

/** Any action of the app's own, from any feature. */
export type AppAction =
  | StartupAction
  | RouteAction
  | ScreenAction
  | SettingsAction
  | LookupAction
  | PreferencesAction
  | StoredPlacesAction
  | UnsavedWorkAction
  | PlatformAction
  | ServerAction
  | NoticesAction
  | OperationsAction;

/** Tells whether a Redux action is one of the app's own, as opposed to one from Redux itself or from another slice. */
export function isAppAction(action: Action): action is AppAction {
  return Object.hasOwn(actions, action.type);
}
