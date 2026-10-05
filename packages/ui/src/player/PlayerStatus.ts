import type { Rational } from "@easyimmerse/types";
import type { PlayerSource } from "./PlayerSource.ts";

/** What the player shows for the open media file. */
export type PlayerStatus =
  | { status: "loading" }
  /** The conversion notice must be accepted before the stream loads. */
  | { status: "notice" }
  | {
      status: "ready";
      source: PlayerSource;
      frameRate: Rational | null;
      hasVideo: boolean;
    }
  | { status: "error"; cause: string };

export const loadingPlayback: PlayerStatus = { status: "loading" };

export const failedPlayback = (cause: string): PlayerStatus => ({
  status: "error",
  cause,
});
