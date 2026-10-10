import type { Effect } from "../app/effect.ts";
import type { ServerEffect } from "../server/serverEffect.ts";
import type { OperationsState, RequestRecord } from "./operations.ts";

type Requests = readonly RequestRecord[];

type SendRequest = Extract<ServerEffect, { type: "sendRequest" }>;

type AbortRequest = Extract<ServerEffect, { type: "abortRequest" }>;

/**
 * Records the requests that the effects send and abort, and returns the effects to perform.
 * A scoped request waits, and its send is held back, while another request of its scope is in flight;
 * then the first waiting request of each scope with none in flight is sent.
 * The abort of a waiting request forgets it and settles it as aborted, since it was never sent,
 * unless the same effects send its id again, which replaces it instead.
 */
export function trackRequests(
  operations: OperationsState,
  effects: readonly Effect[],
): readonly [OperationsState, readonly Effect[]] {
  const [recorded, performed] = recordEffects(operations.requests, effects);
  const [requests, started] = startNextOfEachScope(recorded);
  return [
    requests === operations.requests ? operations : { requests },
    [...performed, ...started],
  ];
}

function recordEffects(
  requests: Requests,
  effects: readonly Effect[],
): readonly [Requests, readonly Effect[]] {
  let recorded = requests;
  let performed: Effect[] = [];
  for (const effect of effects) {
    if (effect.type === "sendRequest") {
      performed = performed.filter((other) => !isWithdrawal(other, effect.id));
      const [next, toPerform] = recordSend(recorded, effect);
      recorded = next;
      performed.push(...toPerform);
    } else if (effect.type === "abortRequest") {
      if (!performed.some((other) => isWithdrawal(other, effect.id)))
        performed.push(...recordAbort(recorded, effect));
    } else performed.push(effect);
  }
  const withdrawn = performed.filter(
    ({ type }) => type === "settleWithdrawnRequest",
  );
  return [forgetWithdrawn(recorded, withdrawn), performed];
}

/**
 * Records a send. A request goes out at once unless it is scoped and its id is not the one in flight.
 * A send of an id recorded with the same scope replaces that request in its place; with another scope, it is a new request.
 */
function recordSend(
  requests: Requests,
  { id, request, scope }: SendRequest,
): readonly [Requests, readonly Effect[]] {
  const found = requests.find((record) => record.id === id);
  const earlier = found?.scope === scope ? found : undefined;
  const isWaiting = scope !== undefined && (earlier?.isWaiting ?? true);
  const record: RequestRecord = { id, request, scope, isWaiting };
  const recorded = earlier
    ? requests.map((other) => (other === earlier ? record : other))
    : [...requests.filter((other) => other !== found), record];
  return [recorded, isWaiting ? [] : [sendEffectOf(record)]];
}

/** Returns the effect that performs an abort: the abort itself for a request in flight, or the settling of a waiting one. */
function recordAbort(
  requests: Requests,
  effect: AbortRequest,
): readonly Effect[] {
  const aborted = requests.find(({ id }) => id === effect.id);
  if (!aborted?.isWaiting) return [effect];
  return [
    {
      type: "settleWithdrawnRequest",
      id: aborted.id,
      request: aborted.request,
    },
  ];
}

function isWithdrawal(effect: Effect, id: string): boolean {
  return effect.type === "settleWithdrawnRequest" && effect.id === id;
}

function forgetWithdrawn(
  requests: Requests,
  withdrawn: readonly Effect[],
): Requests {
  if (withdrawn.length === 0) return requests;
  return requests.filter(
    ({ id }) => !withdrawn.some((effect) => isWithdrawal(effect, id)),
  );
}

/** Sends the first waiting request of each scope that has no request in flight. */
function startNextOfEachScope(
  requests: Requests,
): readonly [Requests, readonly Effect[]] {
  const busyScopes = new Set(
    requests.filter((record) => !record.isWaiting).map(({ scope }) => scope),
  );
  const next: RequestRecord[] = [];
  const started: Effect[] = [];
  for (const record of requests) {
    if (!record.isWaiting || busyScopes.has(record.scope)) {
      next.push(record);
      continue;
    }
    busyScopes.add(record.scope);
    const sending = { ...record, isWaiting: false };
    next.push(sending);
    started.push(sendEffectOf(sending));
  }
  return started.length === 0 ? [requests, []] : [next, started];
}

function sendEffectOf({ id, request, scope }: RequestRecord): SendRequest {
  return { type: "sendRequest", id, request, scope };
}
