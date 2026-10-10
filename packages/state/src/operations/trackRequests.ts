import type { Effect } from "../app/effect.ts";
import type { OperationsState, RequestRecord } from "./operations.ts";
import { recordRequestEffects, sendEffectOf } from "./recordRequestEffects.ts";

type Requests = readonly RequestRecord[];

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
  const [recorded, performed] = recordRequestEffects(
    operations.requests,
    effects,
  );
  const [requests, started] = startNextOfEachScope(recorded);
  return [
    requests === operations.requests ? operations : { requests },
    [...performed, ...started],
  ];
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
