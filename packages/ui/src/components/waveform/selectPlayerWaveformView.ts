import type { RootState } from "@easyimmerse/state";
import {
  selectCurrentTime,
  selectMediaDurationMs,
  selectPathPlayback,
  selectRequestedWaveformSpan,
} from "@easyimmerse/state";
import { createSelector } from "reselect";
import { clampVisibleSpan, computeViewStart } from "./waveformGeometry.ts";

/**
 * Returns what the waveform strip under the player shows: the file's length, the current time, the span in view,
 * and the stretch of the file whose peaks windows it wants.
 */
export const selectPlayerWaveformView = createSelector(
  [
    selectMediaDurationMs,
    selectCurrentTime,
    selectRequestedWaveformSpan,
    (state: RootState) => selectPathPlayback(state) !== null,
  ],
  (durationMs, currentTimeSeconds, requestedSpanMs, isOnServerDisk) => {
    const currentTimeMs = currentTimeSeconds * 1000;
    const visibleSpanMs = clampVisibleSpan(requestedSpanMs, durationMs);
    const viewStartMs = computeViewStart(
      currentTimeMs,
      visibleSpanMs,
      durationMs,
    );
    return {
      durationMs,
      currentTimeMs,
      visibleSpanMs,
      windowView: {
        viewStartMs,
        viewEndMs: viewStartMs + visibleSpanMs,
        focusMs: currentTimeMs,
        // A file the browser holds has no peaks on the server, so its view wants no windows.
        durationMs: isOnServerDisk ? durationMs : 0,
      },
    };
  },
);
