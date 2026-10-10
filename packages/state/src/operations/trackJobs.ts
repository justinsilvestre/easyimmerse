import type { Effect, PerformedEffect } from "../app/effect.ts";
import { updated } from "../app/updated.ts";
import type { FailedRequestsEffect } from "./failedRequests.ts";
import type { JobsState } from "./jobs.ts";
import { jobKey } from "./jobs.ts";

/**
 * Records the jobs that the effects start watching, forgets those they stop watching, and returns the effects to perform.
 * A watched job's status is asked for at once, and a job watched again starts over;
 * an unwatched job's timer is cancelled and its status request aborted.
 */
export function trackJobs(
  jobs: JobsState,
  effects: readonly Exclude<Effect, FailedRequestsEffect>[],
) {
  let tracked = jobs;
  const performed: PerformedEffect[] = [];
  for (const effect of effects) {
    if (effect.type === "watchJob") {
      const { job } = effect;
      const key = jobKey(job.kind, job.request.jobId);
      if (tracked[key] !== undefined)
        performed.push({ type: "cancelTimer", id: key });
      tracked = {
        ...tracked,
        [key]: { ...job, status: "running", report: null },
      };
      performed.push({ type: "sendRequest", id: key, request: job.request });
    } else if (effect.type === "unwatchJob") {
      if (tracked[effect.key] === undefined) continue;
      const { [effect.key]: _forgotten, ...rest } = tracked;
      tracked = rest;
      performed.push(
        { type: "cancelTimer", id: effect.key },
        { type: "abortRequest", id: effect.key },
      );
    } else performed.push(effect);
  }
  return updated(tracked, ...performed);
}
