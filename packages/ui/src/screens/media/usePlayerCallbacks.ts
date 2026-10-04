import { actions } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { useAppDispatch } from "../../hooks/useAppDispatch.ts";
import type { PlayerCallbacks } from "../../media/PlayerControls.tsx";

/** How far a skip moves the media when there are no cues to skip to. */
const skipStepMs = 5000;

type Panel = "cues" | "waveform" | "distractionFree";

/** The player controls' callbacks: transport goes through the store; the panels and subtitles display are the screen's own. */
export function usePlayerCallbacks({
  cues,
  currentMs,
  durationMs,
  onToggleSubtitleDisplay,
  onTogglePanel,
}: {
  cues: readonly Cue[];
  currentMs: number;
  durationMs: number;
  onToggleSubtitleDisplay: () => void;
  onTogglePanel: (panel: Panel) => void;
}): PlayerCallbacks {
  const dispatch = useAppDispatch();
  const seek = (ms: number) => dispatch(actions.seekRequested(ms / 1000));
  return {
    onTogglePlay: () => dispatch(actions.playToggleRequested()),
    onSeek: seek,
    onSkip: (direction) =>
      seek(skipTarget(cues, currentMs, durationMs, direction)),
    onVolumeChange: (volume) => dispatch(actions.volumeChosen(volume)),
    onSpeedChange: (speed) => dispatch(actions.rateChosen(speed)),
    onAudioTrackChange: () => undefined,
    onToggleSubtitleDisplay,
    onToggleCuePanel: () => onTogglePanel("cues"),
    onToggleWaveform: () => onTogglePanel("waveform"),
    onToggleDistractionFree: () => onTogglePanel("distractionFree"),
  };
}

/**
 * The time a skip lands on: the start of the next cue, or of the previous one (the current cue's own
 * start when more than a second into it); without cues, a few seconds either way.
 */
export function skipTarget(
  cues: readonly Cue[],
  currentMs: number,
  durationMs: number,
  direction: "back" | "forward",
): number {
  if (cues.length === 0) {
    const step = direction === "forward" ? skipStepMs : -skipStepMs;
    return Math.min(Math.max(currentMs + step, 0), durationMs);
  }
  if (direction === "forward")
    return cues.find((cue) => cue.start_ms > currentMs)?.start_ms ?? currentMs;
  const earlier = cues.filter((cue) => cue.start_ms < currentMs - 1000);
  return earlier.at(-1)?.start_ms ?? 0;
}
