import type { Effect } from "../app/effect.ts";
import type { OperationsState } from "./operations.ts";
import { trackJobs } from "./trackJobs.ts";
import { trackRequests } from "./trackRequests.ts";

/**
 * Records the jobs and requests that the effects start and stop, and returns the effects to perform.
 * The jobs come first, since watching a job sends its status request.
 */
export function trackOperations(
  operations: OperationsState,
  effects: readonly Effect[],
) {
  const [jobs, performed] = trackJobs(operations.jobs, effects);
  return trackRequests(
    jobs === operations.jobs ? operations : { ...operations, jobs },
    performed,
  );
}
