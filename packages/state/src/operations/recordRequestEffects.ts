import type { PerformedEffect } from "../app/effect.ts";
import { updated } from "../app/updated.ts";
import type { ServerEffect } from "../server/serverEffect.ts";
import type { RequestRecord } from "./operations.ts";

type Requests = readonly RequestRecord[];

type SendRequest = Extract<ServerEffect, { type: "sendRequest" }>;

type AbortRequest = Extract<ServerEffect, { type: "abortRequest" }>;

/**
 * Records the requests that the effects send and abort, and returns the effects to perform in their place.
 * A scoped send is recorded as waiting and held back unless its id is the one in flight.
 * The abort of a waiting request forgets it and settles it as aborted, unless the same effects send its id again.
 */
export function recordRequestEffects(
  requests: Requests,
  effects: readonly PerformedEffect[],
) {
  let recorded = requests;
  let performed: PerformedEffect[] = [];
  for (const effect of effects) {
    if (effect.type === "sendRequest") {
      performed = performed.filter((other) => !isWithdrawal(other, effect.id));
      const [next, toPerform] = recordSend(recorded, effect);
      recorded = next;
      performed.push(...toPerform);
    } else if (effect.type === "abortRequest") {
      if (!performed.some((other) => isWithdrawal(other, effect.id)))
        performed.push(recordAbort(recorded, effect));
    } else performed.push(effect);
  }
  const withdrawn = performed.filter(
    ({ type }) => type === "settleWithdrawnRequest",
  );
  return updated(forgetWithdrawn(recorded, withdrawn), ...performed);
}

/**
 * Records a send. A request goes out at once unless it is scoped and its id is not the one in flight.
 * A send of an id already recorded replaces that request in its place and keeps the scope it was first sent with.
 */
function recordSend(requests: Requests, effect: SendRequest) {
  const earlier = requests.find(({ id }) => id === effect.id);
  const scope = earlier ? earlier.scope : effect.scope;
  const isWaiting = scope !== undefined && (earlier?.isWaiting ?? true);
  const record: RequestRecord = {
    id: effect.id,
    request: effect.request,
    scope,
    isWaiting,
    timeLimitMs: effect.timeLimitMs,
  };
  const recorded = earlier
    ? requests.map((other) => (other === earlier ? record : other))
    : [...requests, record];
  return isWaiting
    ? updated(recorded)
    : updated(recorded, sendEffectOf(record));
}

/** Returns the effect that performs an abort: the abort itself for a request in flight, or the settling of a waiting one. */
function recordAbort(requests: Requests, effect: AbortRequest) {
  const aborted = requests.find(({ id }) => id === effect.id);
  if (!aborted?.isWaiting) return effect;
  return {
    type: "settleWithdrawnRequest",
    id: aborted.id,
    request: aborted.request,
  } satisfies PerformedEffect;
}

function isWithdrawal(effect: PerformedEffect, id: string): boolean {
  return effect.type === "settleWithdrawnRequest" && effect.id === id;
}

function forgetWithdrawn(
  requests: Requests,
  withdrawn: readonly PerformedEffect[],
): Requests {
  if (withdrawn.length === 0) return requests;
  return requests.filter(
    ({ id }) => !withdrawn.some((effect) => isWithdrawal(effect, id)),
  );
}

/** Describes the send of a recorded request. */
export function sendEffectOf({
  id,
  request,
  scope,
  timeLimitMs,
}: RequestRecord): SendRequest {
  return timeLimitMs === undefined
    ? { type: "sendRequest", id, request, scope }
    : { type: "sendRequest", id, request, scope, timeLimitMs };
}
