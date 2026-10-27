import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import { emptyServerCache } from "../server/serverCacheWith.ts";
import { type AppAction, actions } from "./appAction.ts";
import type { AppState } from "./appState.ts";
import type { PerformedEffect } from "./effect.ts";
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

/** The state after an action and the actions its update dispatches in turn, and the locations its history reports, as the store would leave it. */
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
  return effects.reduce((current, effect) => {
    const followed = actionFollowing(effect, current);
    return followed === null
      ? current
      : updatedWithCache(current, followed, backend);
  }, next);
}

/**
 * Returns the location the history reports after a request for a move, from the given state, so that a test of the move's consequences can name the request.
 * Throws when the request asks for no move.
 */
export function reportedLocationOf(
  app: AppState,
  request: AppAction,
): AppAction {
  const [next, effects] = update(app, request);
  for (const effect of effects) {
    const followed = actionFollowing(effect, next);
    if (followed?.type === "locationChanged") return followed;
  }
  throw new Error(`${request.type} asks for no move from here.`);
}

/**
 * Returns the action that follows an effect in the store: the action a dispatch effect names,
 * and the location the history reports after a write, or after a return to the previous entry, whose own previous path it does not know.
 */
function actionFollowing(
  effect: PerformedEffect,
  state: AppState,
): AppAction | null {
  switch (effect.type) {
    case "dispatch":
      return effect.action;
    case "writeLocation":
      return actions.locationChanged(
        effect.entry.path,
        effect.entry.state,
        "write",
      );
    case "returnToPreviousLocation": {
      const path = state.routeHistory.previousPath;
      return path === null ? null : actions.locationChanged(path);
    }
    default:
      return null;
  }
}
