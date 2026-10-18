import type { RequestOutcome } from "./serverRequest.ts";

/** Tells whether a request ended because it was aborted, as a request replaced by a later one with its id is. */
export function isAborted(outcome: RequestOutcome): boolean {
  return !outcome.ok && outcome.error.status === "ABORTED";
}
