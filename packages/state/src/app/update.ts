import { operationsFeature } from "../operations/operations.ts";
import { platformCommands } from "../platform/platformCommands.ts";
import { preferencesFeature } from "../preferences/updatePreferences.ts";
import { routeFeature } from "../route/updateRoute.ts";
import { screenFeature } from "../screen/updateScreen.ts";
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
  preferences: preferencesFeature,
  storedPlaces: storedPlacesFeature,
  unsavedWork: unsavedWorkFeature,
  operations: operationsFeature,
} satisfies FeatureTable;

const featureNames = Object.keys(features) as (keyof AppState)[];

export const initialAppState = Object.fromEntries(
  featureNames.map((name) => [name, features[name].initialState]),
) as AppState;

/**
 * Lets every feature update its own slice, each seeing the state before the action, and gathers their effects in the order of the feature table.
 * The platform commands are the only effects that do not come from a feature, since they change no state.
 */
export const update: Update<AppState, AppAction, Effect> = (state, action) => {
  const next = { ...state };
  const effects: Effect[] = [];
  for (const name of featureNames) {
    const [slice, sliceEffects] = updateSlice(name, state, action);
    Object.assign(next, { [name]: slice });
    effects.push(...sliceEffects);
  }
  return [next, [...effects, ...platformCommands(action)]];
};

function updateSlice<K extends keyof AppState>(
  name: K,
  state: AppState,
  action: AppAction,
): readonly [AppState[K], readonly Effect[]] {
  const feature: Feature<AppState[K]> = (features as FeatureTable)[name];
  return feature.update(state[name], action, state);
}
