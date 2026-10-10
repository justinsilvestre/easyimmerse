import type { Effect } from "../app/effect.ts";
import type { ServerRequest } from "../server/serverRequest.ts";
import type { FailedRequestsEffect } from "./failedRequests.ts";
import { freeRequestId } from "./freeRequestId.ts";
import type { RequestRecord } from "./operations.ts";

/**
 * Sends a request under the first id free below a prefix, for a sender that recognizes the request's outcome by the prefix alone.
 * Features return it, and the middleware never sees it: `assignFreeRequestIds` gives it its id.
 */
export type FreeIdRequestEffect = {
  type: "sendRequestWithFreeId";
  prefix: string;
  request: ServerRequest;
};

type Unnumbered = Exclude<Effect, FailedRequestsEffect>;

/** Gives each request sent with a free id the first id below its prefix that neither the recorded requests nor the other sends hold. */
export function assignFreeRequestIds(
  requests: readonly RequestRecord[],
  effects: readonly Unnumbered[],
) {
  const taken = effects.flatMap((effect) =>
    effect.type === "sendRequest" ? [effect.id] : [],
  );
  return effects.map((effect) => {
    if (effect.type !== "sendRequestWithFreeId") return effect;
    const id = freeRequestId(effect.prefix, requests, taken);
    taken.push(id);
    return {
      type: "sendRequest",
      id,
      request: effect.request,
    } satisfies Effect;
  });
}
