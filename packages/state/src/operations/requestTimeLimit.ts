import type { AppAction } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import type { TimerEffect } from "../timers/timerEffect.ts";
import type { RequestRecord } from "./operations.ts";
import { operationsActions } from "./operationsActions.ts";

const timerIdOf = (requestId: string) => `requests/limit/${requestId}`;

/** Starts the time limit of a request that has just been sent. */
export function timeLimitTimer(requestId: string, ms: number): TimerEffect {
  return {
    type: "startTimer",
    id: timerIdOf(requestId),
    ms,
    action: operationsActions.requestTimeLimitPassed(requestId),
  };
}

/**
 * Returns the effects of an action on the time limits of the requests in flight:
 * a request that passes its limit is aborted, and a request that settles has its limit cancelled.
 */
export function timeLimitEffects(
  requests: readonly RequestRecord[],
  action: AppAction,
): readonly Effect[] {
  if (
    action.type !== "requestSettled" &&
    action.type !== "requestTimeLimitPassed"
  )
    return [];
  const record = requests.find(({ id }) => id === action.id);
  if (record?.timeLimitMs === undefined || record.isWaiting) return [];
  return action.type === "requestSettled"
    ? [{ type: "cancelTimer", id: timerIdOf(record.id) }]
    : [{ type: "abortRequest", id: record.id }];
}
