import type { Middleware } from "redux";
import type { Effects } from "../platform/effects.ts";
import { createRequestTable } from "../server/requestTable.ts";
import type { RequestRunner } from "../server/serverRequest.ts";
import { createTimerTable } from "../timers/timerTable.ts";
import type { PerformedEffect } from "./effect.ts";
import { runEffect } from "./runEffect.ts";

/**
 * Builds the middleware that performs the effects queued by the app reducer after each dispatch.
 * It keeps the store's pending timers, and its requests in flight, which it sends through `runRequest`.
 */
export function createEffectsMiddleware(
  effects: Effects,
  runRequest: RequestRunner,
  drainEffects: () => readonly PerformedEffect[],
): Middleware {
  const timers = createTimerTable(effects.clock);
  return (api) => {
    const requests = createRequestTable((request) =>
      runRequest(request, api.dispatch),
    );
    return (next) => (action) => {
      const result = next(action);
      const context = { effects, dispatch: api.dispatch, timers, requests };
      for (const effect of drainEffects()) runEffect(effect, context);
      return result;
    };
  };
}
