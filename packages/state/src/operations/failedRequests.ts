import type { Effect } from "../app/effect.ts";
import { updated } from "../app/updated.ts";
import type { RequestFailure, ServerRequest } from "../server/serverRequest.ts";

/** A request that failed and is kept, under an id of its own, until the feature that kept it forgets it. */
export type FailedRequest = {
  id: string;
  request: ServerRequest;
  failure: RequestFailure;
};

/**
 * Keeps or forgets a failed request. Features return these, and the middleware never sees them:
 * `trackFailedRequests` records them in the operations.
 */
export type FailedRequestsEffect =
  | { type: "keepFailedRequest"; failed: FailedRequest }
  | { type: "forgetFailedRequest"; id: string };

type FailedRequests = readonly FailedRequest[];

/** Records the failed requests that the effects keep and forget, and returns the other effects. A kept request replaces one with its id. */
export function trackFailedRequests(
  failedRequests: FailedRequests,
  effects: readonly Effect[],
) {
  let next = failedRequests;
  const others: Exclude<Effect, FailedRequestsEffect>[] = [];
  for (const effect of effects) {
    if (effect.type === "keepFailedRequest") next = kept(next, effect.failed);
    else if (effect.type === "forgetFailedRequest")
      next = forgotten(next, effect.id);
    else others.push(effect);
  }
  return updated(next, ...others);
}

function kept(failedRequests: FailedRequests, failed: FailedRequest) {
  return failedRequests.some(({ id }) => id === failed.id)
    ? failedRequests.map((other) => (other.id === failed.id ? failed : other))
    : [...failedRequests, failed];
}

function forgotten(failedRequests: FailedRequests, forgottenId: string) {
  const remaining = failedRequests.filter(({ id }) => id !== forgottenId);
  return remaining.length === failedRequests.length
    ? failedRequests
    : remaining;
}
