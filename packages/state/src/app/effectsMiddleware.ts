import type { Middleware } from "redux";
import type { Effects } from "../platform/effects.ts";
import type { Effect } from "./effect.ts";
import { runEffect } from "./runEffect.ts";

/** Builds the middleware that performs the effects queued by the app reducer after each dispatch. */
export function createEffectsMiddleware(
  effects: Effects,
  drainEffects: () => readonly Effect[],
): Middleware {
  return (api) => (next) => (action) => {
    const result = next(action);
    for (const effect of drainEffects())
      runEffect(effect, { effects, dispatch: api.dispatch });
    return result;
  };
}
