import type { AppAction } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import type { TimerEffect } from "../timers/timerEffect.ts";
import type { RequestRecord } from "./operations.ts";
import { operationsActions } from "./operationsActions.ts";

const timerIdOf = (requestId: string) => `requests/slow/${requestId}`;

/** Starts the wait after which a request that has just been sent counts as slow. */
export function slownessTimer(requestId: string, ms: number) {
  return {
    type: "startTimer",
    id: timerIdOf(requestId),
    ms,
    action: operationsActions.requestWentSlow(requestId),
  } satisfies TimerEffect;
}

/** Cancels the slowness timer of a request that settles. */
export function slownessEffects(
  requests: readonly RequestRecord[],
  action: AppAction,
) {
  if (action.type !== "requestSettled") return [];
  const record = requests.find(({ id }) => id === action.id);
  if (record?.slowAfterMs === undefined || record.isWaiting) return [];
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
