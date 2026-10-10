import type { AppAction } from "./appAction.ts";
import type { AppState } from "./appState.ts";
import { initialAppState, update } from "./update.ts";

/** Returns the app state after the given actions, starting from the initial state, so that tests reach nested state through real actions. */
export function stateAfter(...actions: AppAction[]): AppState {
  return actions.reduce(
    (state, action) => update(state, action)[0],
    initialAppState,
  );
}
