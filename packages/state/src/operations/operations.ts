import type { Feature } from "../app/feature.ts";
import type { ServerRequest } from "../server/serverRequest.ts";
import type { JobsState } from "./jobs.ts";
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
};

/** Work under way that any feature may ask about. */
export type OperationsState = {
  /** Every request sent and not yet settled, in the order they were asked for. */
  requests: readonly RequestRecord[];
  /** Server jobs being polled, of either kind, until the feature that started each one stops watching it. */
  jobs: JobsState;
  /**
   * How many flashcards have been started from words' lookups since the app started.
   * It numbers their lookup requests, so that no screen's request reuses the id of one still in flight from an earlier screen.
   */
  lookupFlashcardsStarted: number;
};

/**
 * The operations as a feature. It forgets a request once it settles and polls the watched jobs;
 * the root update records the requests sent and the jobs watched.
 */
export const operationsFeature: Feature<OperationsState> = {
  initialState: { requests: [], jobs: {}, lookupFlashcardsStarted: 0 },
  update: (operations, action) => {
    const [jobs, effects] = updateJobs(operations.jobs, action);
    const requests = forgetSettled(
      operations.requests,
      action.type === "requestSettled" ? action.id : null,
    );
    const lookupFlashcardsStarted =
      operations.lookupFlashcardsStarted +
      (action.type === "lookupFlashcardRequested" ? 1 : 0);
    return requests === operations.requests &&
      jobs === operations.jobs &&
      lookupFlashcardsStarted === operations.lookupFlashcardsStarted
      ? [operations, effects]
      : [{ requests, jobs, lookupFlashcardsStarted }, effects];
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
