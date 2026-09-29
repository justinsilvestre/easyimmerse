import type { AppState } from "./AppState.ts";
import type { AppAction } from "./appActions.ts";
import { type Effect, effects } from "./effects.ts";

export type AppUpdate = [state: AppState, effects: Effect[]];

/**
 * Computes the next state of the app after an action,
 * along with the side effects to be carried out as a consequence.
 * Actions of unknown types leave the state unchanged.
 */
export function updateApp(state: AppState, action: AppAction): AppUpdate {
  switch (action.type) {
    case "appStarted":
      return [state, [effects.resolveServerUrl()]];
    case "screenOpened":
      return [{ ...state, screen: action.screen }, []];
    case "serverUrlResolved":
      return [{ ...state, serverUrl: action.serverUrl }, []];
    default:
      return [state, []];
  }
}
