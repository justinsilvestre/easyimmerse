import type { Cue } from "@easyimmerse/types";
import type { ItemSpan } from "../hooks/useVisibleItemSpan.ts";

/** How far ahead of the playback position the words of the subtitles are looked up. */
const aheadMs = 60_000;

/**
 * The cues whose words to look up ahead of the user, most urgent first:
 * the cue shown, then those spoken within the next minute, then those the cue panel shows, where `panelSpan` gives their positions in `cues`.
 */
export function cuesToPrefetch(
  cues: readonly Cue[],
  {
    shownCue,
    currentMs,
    panelSpan,
  }: { shownCue: Cue | null; currentMs: number; panelSpan: ItemSpan | null },
): Cue[] {
  const upcoming = cues.filter(
    (cue) => cue.end_ms > currentMs && cue.start_ms < currentMs + aheadMs,
  );
  const inPanel = panelSpan
    ? cues.slice(panelSpan.first, panelSpan.last + 1)
    : [];
  return [
    ...new Set([...(shownCue ? [shownCue] : []), ...upcoming, ...inPanel]),
  ];
}
