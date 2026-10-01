import type { TimeRange } from "@easyimmerse/types";

/** A range the player repeats, and the time it seeks to whenever playback leaves the range. Times are in milliseconds. */
export type PlayerLoop = { range: TimeRange; restartMs: number };
