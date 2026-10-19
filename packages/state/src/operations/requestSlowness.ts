import type { AppAction } from "../app/appAction.ts";
import type { Effect, PerformedEffect } from "../app/effect.ts";
import type { TimerEffect } from "../timers/timerEffect.ts";
import type { RequestRecord } from "./operations.ts";
import { operationsActions } from "./operationsActions.ts";

const timerIdOf = (requestId: string) => `requests/slow/${requestId}`;

/** Starts the wait after which a request just asked for counts as slow, if it can go slow. */
export function firstRecordedSlownessTimers({
  id,
  slowAfterMs,
}: RequestRecord): TimerEffect[] {
  if (slowAfterMs === undefined) return [];
  const action = operationsActions.requestWentSlow(id);
  return [{ type: "startTimer", id: timerIdOf(id), ms: slowAfterMs, action }];
}

/** Cancels the slowness timers of the waiting requests that the effects withdrew. */
export function withdrawnSlownessCancels(
  requests: readonly RequestRecord[],
  withdrawn: readonly PerformedEffect[],
): TimerEffect[] {
  return requests
    .filter(
      ({ id, slowAfterMs }) =>
        slowAfterMs !== undefined &&
        withdrawn.some(
          (effect) =>
            effect.type === "settleWithdrawnRequest" && effect.id === id,
        ),
    )
    .map(({ id }) => ({ type: "cancelTimer", id: timerIdOf(id) }));
}

/** Cancels the slowness timer of a request that settles. Cancelling a timer that is no longer pending does nothing. */
export function slownessEffects(
  requests: readonly RequestRecord[],
  action: AppAction,
) {
  if (action.type !== "requestSettled") return [];
  const record = requests.find(({ id }) => id === action.id);
  if (record?.slowAfterMs === undefined) return [];
  return [{ type: "cancelTimer", id: timerIdOf(record.id) } satisfies Effect];
}

/** Marks as slow the request whose slowness timer has run out, if it is still recorded. */
export function markSlow(
  requests: readonly RequestRecord[],
  action: AppAction,
): readonly RequestRecord[] {
  if (action.type !== "requestWentSlow") return requests;
  if (!requests.some(({ id }) => id === action.id)) return requests;
  return requests.map((record) =>
    record.id === action.id ? { ...record, isSlow: true } : record,
  );
}
