import { flashcardCommands } from "../flashcards/flashcardCommands.ts";
import { noticesFeature } from "../notices/updateNotices.ts";
import { operationsFeature } from "../operations/operations.ts";
import { trackOperations } from "../operations/trackOperations.ts";
import { platformCommands } from "../platform/platformCommands.ts";
import { preferencesFeature } from "../preferences/updatePreferences.ts";
import { routeFeature } from "../route/updateRoute.ts";
import { screenCommands } from "../screen/screenCommands.ts";
import { screenFeature } from "../screen/updateScreen.ts";
import { serverFeature } from "../server/serverState.ts";
import { storedPlacesFeature } from "../storedPlaces/updateStoredPlaces.ts";
import type { AppAction } from "./appAction.ts";
import type { AppState } from "./appState.ts";
import { closeGuardEffects } from "./closeGuard.ts";
import type { Effect, PerformedEffect } from "./effect.ts";
import type { Feature } from "./feature.ts";
import { updated } from "./updated.ts";

/** Computes the next state and the effects to perform in response to an action. */
export type UpdateFunction<S, A, E> = (state: S, action: A) => Update<S, E>;

export type Update<S, E> = readonly [S, readonly E[]];

type FeatureTable = {
  [K in keyof AppState]: Feature<AppState[K], keyof AppState>;
};

const features = {
  route: routeFeature,
  screen: screenFeature,
  server: serverFeature,
  preferences: preferencesFeature,
  storedPlaces: storedPlacesFeature,
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
export const update: UpdateFunction<AppState, AppAction, PerformedEffect> = (
  state,
  action,
) => {
  const [next, effects] = updateFeatures(state, action);
  if (action.type !== "noticeButtonChosen") return updated(next, ...effects);
  const [chosen, chosenEffects] = update(next, action.action);
  return updated(chosen, ...effects, ...chosenEffects);
};

/**
 * Lets every feature update its own slice, each seeing the state before the action, and gathers their effects in the order of the feature table.
 * The state keeps its reference when no slice changes.
 * Beside the features, the root update takes three fixed steps: it adds the platform, screen and flashcard commands, which change no state;
 * it passes every effect through `trackOperations`, which turns the jobs watched into status requests and timers,
 * records the requests sent, and holds back those that must wait; and it guards the app's closing whenever unsaved work
 * begins, and stops once none is left, as `closeGuardEffects` describes.
 */
function updateFeatures(state: AppState, action: AppAction) {
  let next = state;
  const effects: Effect[] = [];
  for (const name of featureNames) {
    const [slice, sliceEffects] = updateSlice(name, state, action);
    if (slice !== state[name]) next = { ...next, [name]: slice };
    effects.push(...sliceEffects);
  }
  effects.push(...platformCommands(action));
  effects.push(...screenCommands(action, state));
  effects.push(...flashcardCommands(action, state));
  const [operations, performed] = trackOperations(next.operations, effects);
  const tracked =
    operations === next.operations ? next : { ...next, operations };
  return updated(tracked, ...performed, ...closeGuardEffects(state, tracked));
}

function updateSlice<K extends keyof AppState>(
  name: K,
  state: AppState,
  action: AppAction,
): Update<AppState[K], Effect> {
  const feature: Feature<AppState[K], keyof AppState> = (
    features as FeatureTable
  )[name];
  return feature.update(state[name], action, state);
}
