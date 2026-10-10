import type { Effect } from "../app/effect.ts";
import { trackFailedRequests } from "./failedRequests.ts";
import { assignFreeRequestIds } from "./freeIdRequests.ts";
import type { OperationsState } from "./operations.ts";
import { trackJobs } from "./trackJobs.ts";
import { trackRequests } from "./trackRequests.ts";

/**
 * Records the failed requests kept and forgotten, gives the requests sent with a free id their ids,
 * records the jobs and requests that the effects start and stop, and returns the effects to perform.
 * The jobs come before the requests, since watching a job sends its status request.
 */
export function trackOperations(
  operations: OperationsState,
  effects: readonly Effect[],
) {
  const [failedRequests, others] = trackFailedRequests(
    operations.failedRequests,
    effects,
  );
  const withIds = assignFreeRequestIds(operations.requests, others);
  const [jobs, performed] = trackJobs(operations.jobs, withIds);
  const changed =
    failedRequests === operations.failedRequests && jobs === operations.jobs
      ? operations
      : { ...operations, failedRequests, jobs };
  return trackRequests(changed, performed);
}
