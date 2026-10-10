import { noticesFeature } from "../notices/updateNotices.ts";
import { operationsFeature } from "../operations/operations.ts";
import { trackRequests } from "../operations/trackRequests.ts";
import { platformCommands } from "../platform/platformCommands.ts";
import { preferencesFeature } from "../preferences/updatePreferences.ts";
import { routeFeature } from "../route/updateRoute.ts";
import { screenFeature } from "../screen/updateScreen.ts";
import { serverFeature } from "../server/serverState.ts";
import { storedPlacesFeature } from "../storedPlaces/updateStoredPlaces.ts";
import { unsavedWorkFeature } from "../unsavedWork/unsavedWork.ts";
import type { AppAction } from "./appAction.ts";
import type { AppState } from "./appState.ts";
import type { Effect } from "./effect.ts";
import type { Feature } from "./feature.ts";

/** Computes the next state and the effects to perform in response to an action. */
export type Update<S, A, E> = (
  state: S,
  action: A,
) => readonly [S, readonly E[]];

type FeatureTable = { [K in keyof AppState]: Feature<AppState[K]> };

const features = {
  route: routeFeature,
  screen: screenFeature,
  server: serverFeature,
  preferences: preferencesFeature,
  storedPlaces: storedPlacesFeature,
  unsavedWork: unsavedWorkFeature,
  notices: noticesFeature,
  operations: operationsFeature,
} satisfies FeatureTable;

const featureNames = Object.keys(features) as (keyof AppState)[];

/** The app state when the app starts: each feature's initial slice. */
export const initialAppState = Object.fromEntries(
  featureNames.map((name) => [name, features[name].initialState]),
) as AppState;

/**
 * Computes the next state and the effects of an action, as `updateFeatures` describes.
 * A chosen notice button is two updates in one dispatch: the features see `noticeButtonChosen`, which closes the notice,
 * and then the button's action, which does what the button says.
 */
export const update: Update<AppState, AppAction, Effect> = (state, action) => {
  const [next, effects] = updateFeatures(state, action);
  if (action.type !== "noticeButtonChosen") return [next, effects];
  const [chosen, chosenEffects] = update(next, action.action);
  return [chosen, [...effects, ...chosenEffects]];
};

/**
 * Lets every feature update its own slice, each seeing the state before the action, and gathers their effects in the order of the feature table.
 * The state keeps its reference when no slice changes.
 * The root update looks at the features' effects in exactly two places: it adds the platform commands, which change no state,
 * and it passes every effect through `trackRequests`, which records the requests sent and holds back those that must wait.
 */
function updateFeatures(
  state: AppState,
  action: AppAction,
): readonly [AppState, readonly Effect[]] {
  let next = state;
  const effects: Effect[] = [];
  for (const name of featureNames) {
    const [slice, sliceEffects] = updateSlice(name, state, action);
    if (slice !== state[name]) next = { ...next, [name]: slice };
    effects.push(...sliceEffects);
  }
  effects.push(...platformCommands(action));
  const [operations, performed] = trackRequests(next.operations, effects);
  return [
    operations === next.operations ? next : { ...next, operations },
    performed,
  ];
}

function updateSlice<K extends keyof AppState>(
  name: K,
  state: AppState,
  action: AppAction,
): readonly [AppState[K], readonly Effect[]] {
  const feature: Feature<AppState[K]> = (features as FeatureTable)[name];
  return feature.update(state[name], action, state);
}
