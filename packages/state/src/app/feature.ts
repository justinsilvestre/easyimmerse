import type { AppAction } from "./appAction.ts";
import type { AppState } from "./appState.ts";
import type { Effect } from "./effect.ts";
import type { Update } from "./update.ts";

/**
 * Computes a feature's next slice and the effects to perform.
 * `app` holds the other slices the feature reads, named by `Deps`, as they were before the action.
 */
export type FeatureUpdate<S, Deps extends keyof AppState = never> = (
  state: S,
  action: AppAction,
  app: Pick<AppState, Deps>,
) => Update<S, Effect>;

/** A slice of the app state with its starting value and its update. */
export type Feature<S, Deps extends keyof AppState = never> = {
  initialState: S;
  update: FeatureUpdate<S, Deps>;
};
