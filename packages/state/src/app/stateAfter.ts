import type { AppAction } from "./appAction.ts";
import type { AppState } from "./appState.ts";
import { initialAppState, update } from "./update.ts";

/** Returns the app state after the given actions, starting from the initial state, so that tests reach nested state through real actions. */
export function stateAfter(...actions: AppAction[]): AppState {
  return actions.reduce(updatedAsDispatched, initialAppState);
}

/** The state after an action and the actions its update dispatches in turn, as the store would leave it. */
export function updatedAsDispatched(
  state: AppState,
  action: AppAction,
): AppState {
  const [next, effects] = update(state, action);
  return effects.reduce(
    (current, effect) =>
      effect.type === "dispatch"
        ? updatedAsDispatched(current, effect.action)
        : current,
    next,
  );
}
