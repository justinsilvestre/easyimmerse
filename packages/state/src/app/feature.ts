import type { AppAction } from "./appAction.ts";
import type { AppState } from "./appState.ts";
import type { Effect } from "./effect.ts";

/** Computes a feature's next slice and the effects to perform; `app` is the whole state before the action, for rules that cross features. */
export type FeatureUpdate<S> = (
  state: S,
  action: AppAction,
  app: AppState,
) => readonly [S, readonly Effect[]];

/** A slice of the app state with its starting value and its update. */
export type Feature<S> = { initialState: S; update: FeatureUpdate<S> };
