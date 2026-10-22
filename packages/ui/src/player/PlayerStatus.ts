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
  | {
      status: "error";
      cause: string;
      /** Set when the video needs converting and no video encoder works, which another ffmpeg build can change. */
      needsVideoEncoder?: true;
    };

export const loadingPlayback: PlayerStatus = { status: "loading" };

export const failedPlayback = (
  cause: string,
  needsVideoEncoder = false,
): PlayerStatus =>
  needsVideoEncoder
    ? { status: "error", cause, needsVideoEncoder }
    : { status: "error", cause };
