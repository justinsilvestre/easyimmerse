import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import { emptyServerCache } from "../server/serverCacheWith.ts";
import type { AppAction } from "./appAction.ts";
import type { AppState } from "./appState.ts";
import { initialAppState, update } from "./update.ts";

/** Returns the app state after the given actions, starting from the initial state, so that tests reach nested state through real actions. */
export function stateAfter(...actions: AppAction[]): AppState {
  return stateAfterWithCache(emptyServerCache, ...actions);
}

/** Returns the app state after the given actions, as `stateAfter` does, with every update reading the given server cache. */
export function stateAfterWithCache(
  backend: ServerCacheSlice,
  ...actions: AppAction[]
): AppState {
  return actions.reduce(
    (state, action) => updatedWithCache(state, action, backend),
    initialAppState,
  );
}

/** The state after an action and the actions its update dispatches in turn, as the store would leave it. */
export function updatedAsDispatched(
  state: AppState,
  action: AppAction,
): AppState {
  return updatedWithCache(state, action, emptyServerCache);
}

function updatedWithCache(
  state: AppState,
  action: AppAction,
  backend: ServerCacheSlice,
): AppState {
  const [next, effects] = update(state, action, backend);
  return effects.reduce(
    (current, effect) =>
      effect.type === "dispatch"
        ? updatedWithCache(current, effect.action, backend)
        : current,
    next,
  );
}
