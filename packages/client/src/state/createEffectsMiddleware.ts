import type { Middleware } from "redux";
import type { AppState } from "./AppState.ts";
import type { AppAction } from "./appActions.ts";
import type { DispatchAppAction, Effect, EffectsRunners } from "./effects.ts";
import { updateApp } from "./updateApp.ts";

type StateWithApp = { app: AppState };

/**
 * Creates the Redux middleware that carries out the effects requested by each state update.
 * An action's effects are run after the state has been updated in response to that action.
 */
export function createEffectsMiddleware(
  runners: EffectsRunners,
): Middleware<object, StateWithApp> {
  return (store) => (next) => (action) => {
    // The update is computed both here and in the reducer, which is safe because it is a pure function.
    const [, effects] = updateApp(store.getState().app, action as AppAction);
    const result = next(action);
    for (const effect of effects) runEffect(runners, effect, store.dispatch);
    return result;
  };
}

function runEffect(
  runners: EffectsRunners,
  effect: Effect,
  dispatch: DispatchAppAction,
) {
  return runners[effect.type](effect, dispatch);
}
