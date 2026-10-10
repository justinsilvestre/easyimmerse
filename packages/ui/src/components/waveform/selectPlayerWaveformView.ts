import {
  clampVisibleSpan,
  selectCurrentTime,
  selectMediaDurationMs,
  selectRequestedWaveformSpan,
} from "@easyimmerse/state";
import { createSelector } from "reselect";

/** Returns what the waveform strip under the player shows: the file's length, the current time and the span in view. */
export const selectPlayerWaveformView = createSelector(
  [selectMediaDurationMs, selectCurrentTime, selectRequestedWaveformSpan],
  (durationMs, currentTimeSeconds, requestedSpanMs) => ({
    durationMs,
    currentTimeMs: currentTimeSeconds * 1000,
    visibleSpanMs: clampVisibleSpan(requestedSpanMs, durationMs),
  }),
);
