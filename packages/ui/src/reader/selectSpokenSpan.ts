import { type RootState, selectPlayer } from "@easyimmerse/state";
import type { TextSpan, TimedSpan } from "@easyimmerse/types";
import { segmentSpokenAt } from "./alignment/audioAlignment.ts";

/**
 * Returns the text the aligned audio speaks at the player's time, or null between segments.
 * Until the audio has played or been moved from its start, nothing counts as spoken, so that an untouched book shows no highlight.
 * The span is the segment's own object, so that it keeps its identity while the same segment is heard.
 */
export function selectSpokenSpan(
  state: RootState,
  segments: readonly TimedSpan[] | undefined,
): TextSpan | null {
  const { isPlaying, currentTimeSeconds } = selectPlayer(state);
  if (segments === undefined || (!isPlaying && currentTimeSeconds === 0))
    return null;
  return segmentSpokenAt(segments, currentTimeSeconds * 1000)?.span ?? null;
}
