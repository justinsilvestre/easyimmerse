import type { Feature } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import type { ServerRequest } from "../server/serverRequest.ts";
import type { FailedRequest } from "./failedRequests.ts";
import type { JobsState } from "./jobs.ts";
import { timeLimitEffects } from "./requestTimeLimit.ts";
import { updateJobs } from "./updateJobs.ts";

/** A request sent and not yet settled. */
export type RequestRecord = {
  id: string;
  request: ServerRequest;
  /**
   * Requests with the same scope are sent one at a time, in the order they were asked for.
   * An id keeps the scope it was first sent with: while it is recorded, a resend's scope is ignored.
   */
  scope?: string;
  /** True while the request waits for an earlier request of its scope to settle. */
  isWaiting: boolean;
  /** How long the request may go unanswered once sent before it is aborted, if it has such a limit. */
  timeLimitMs?: number;
  /** The id of the request this one is held for. A held request is not sent until its id is sent again without it. */
  heldFor?: string;
};

/** Work under way that any feature may ask about. */
export type OperationsState = {
  /** Every request sent and not yet settled, in the order they were asked for. */
  requests: readonly RequestRecord[];
  /** The failed requests that features keep, so that the user can send them again or drop them. */
  failedRequests: readonly FailedRequest[];
  /** Server jobs being polled, of either kind, until the feature that started each one stops watching it. */
  jobs: JobsState;
};

/**
 * The operations as a feature. It forgets a request once it settles, aborts one that passes its time limit, and polls the watched jobs;
 * the root update records the requests sent and the jobs watched.
 */
export const operationsFeature: Feature<OperationsState> = {
  initialState: { requests: [], failedRequests: [], jobs: {} },
  update: (operations, action) => {
    const [jobs, jobEffects] = updateJobs(operations.jobs, action);
    const effects = [
      ...jobEffects,
      ...timeLimitEffects(operations.requests, action),
    ];
    const requests = forgetSettled(
      operations.requests,
      action.type === "requestSettled" ? action.id : null,
    );
    return requests === operations.requests && jobs === operations.jobs
      ? updated(operations, ...effects)
      : updated({ ...operations, requests, jobs }, ...effects);
  },
};

function forgetSettled(
  requests: readonly RequestRecord[],
  settledId: string | null,
): readonly RequestRecord[] {
  if (settledId === null) return requests;
  const remaining = requests.filter(({ id }) => id !== settledId);
  return remaining.length === requests.length ? requests : remaining;
}
