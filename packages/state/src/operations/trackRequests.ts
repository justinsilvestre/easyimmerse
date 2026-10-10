import type { Effect } from "../app/effect.ts";
import type { ServerEffect } from "../server/serverEffect.ts";
import type { OperationsState, RequestRecord } from "./operations.ts";

type Requests = readonly RequestRecord[];

type SendRequest = Extract<ServerEffect, { type: "sendRequest" }>;

/**
 * Records the requests that the effects send and abort, and returns the effects to perform.
 * A scoped request waits, and its send is held back, while another request of its scope is in flight;
 * then the first waiting request of each scope with none in flight is sent.
 * The abort of a waiting request forgets it and settles it as aborted, since it was never sent.
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
  const performed: Effect[] = [];
  for (const effect of effects) {
    const [next, toPerform] = recordEffect(recorded, effect);
    recorded = next;
    performed.push(...toPerform);
  }
  return [recorded, performed];
}

function recordEffect(
  requests: Requests,
  effect: Effect,
): readonly [Requests, readonly Effect[]] {
  if (effect.type === "sendRequest") return recordSend(requests, effect);
  if (effect.type !== "abortRequest") return [requests, [effect]];
  const aborted = requests.find(({ id }) => id === effect.id);
  if (!aborted?.isWaiting) return [requests, [effect]];
  return [
    requests.filter((record) => record !== aborted),
    [
      {
        type: "settleWithdrawnRequest",
        id: aborted.id,
        request: aborted.request,
      },
    ],
  ];
}

/** Records a send. A request goes out at once unless it is scoped and its id is not the one in flight. */
function recordSend(
  requests: Requests,
  { id, request, scope }: SendRequest,
): readonly [Requests, readonly Effect[]] {
  const earlier = requests.find((record) => record.id === id);
  const isWaiting =
    scope !== undefined && (earlier === undefined || earlier.isWaiting);
  const record: RequestRecord = { id, request, scope, isWaiting };
  const recorded = earlier
    ? requests.map((other) => (other === earlier ? record : other))
    : [...requests, record];
  return [recorded, isWaiting ? [] : [sendEffectOf(record)]];
}

/** Sends the first waiting request of each scope that has no request in flight. */
function startNextOfEachScope(
  requests: Requests,
): readonly [Requests, readonly Effect[]] {
  const busyScopes = new Set(
    requests.filter((record) => !record.isWaiting).map(({ scope }) => scope),
  );
  const started: Effect[] = [];
  const next = requests.map((record) => {
    if (!record.isWaiting || busyScopes.has(record.scope)) return record;
    busyScopes.add(record.scope);
    const sending = { ...record, isWaiting: false };
    started.push(sendEffectOf(sending));
    return sending;
  });
  return started.length === 0 ? [requests, []] : [next, started];
}

function sendEffectOf({ id, request, scope }: RequestRecord): SendRequest {
  return scope === undefined
    ? { type: "sendRequest", id, request }
    : { type: "sendRequest", id, request, scope };
}
