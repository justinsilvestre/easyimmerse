import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import type { AppAction } from "./appAction.ts";
import type { AppState } from "./appState.ts";
import type { Effect } from "./effect.ts";
import type { Update } from "./update.ts";

/** Every slice an update may read: the app's slices and the server cache, as they were before the action. */
export type ReadableState = AppState & { backend: ServerCacheSlice };

/**
 * Computes a feature's next slice and the effects to perform.
 * `state` is the one slice the feature owns. `app` holds the other slices it reads, named by `Deps`, as they were before the action.
 */
export type FeatureUpdate<S, Deps extends keyof ReadableState = never> = (
  state: S,
  action: AppAction,
  app: Pick<ReadableState, Deps>,
) => Update<S, Effect>;

/**
 * A slice of the app state with its starting value and its update.
 * A feature may instead keep no slice and contribute only effects through a command function listed in `app/update.ts`, as the platform, screen and flashcard features do.
 */
export type Feature<S, Deps extends keyof ReadableState = never> = {
  initialState: S;
  update: FeatureUpdate<S, Deps>;
};
