import type { WatchedJob } from "./jobs.ts";

/**
 * Starts or stops polling a server job. Features return these, and the middleware never sees them:
 * `trackJobs` sends the job's status requests and cancels and aborts them, and `updateJobs` starts the polling timers.
 */
export type JobsEffect =
  | { type: "watchJob"; job: WatchedJob }
  | { type: "unwatchJob"; key: string };
