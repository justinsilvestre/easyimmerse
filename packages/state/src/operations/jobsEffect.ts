import type { WatchedJob } from "./jobs.ts";

/**
 * Starts or stops polling a server job.
 * Features return these; the root update turns them into status requests and timers, so the middleware never sees them.
 */
export type JobsEffect =
  | { type: "watchJob"; key: string; job: WatchedJob }
  | { type: "unwatchJob"; key: string };
