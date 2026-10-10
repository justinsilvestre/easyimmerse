import type { MediaScreenState } from "../screenState.ts";
import { clampVisibleSpan, computeViewStart } from "./waveformSpan.ts";
import type { WaveformViewName } from "./waveformState.ts";
import type { WaveformWindowView } from "./waveformWindowPolicy.ts";

/** How much of the file around a flashcard's clip is loaded, so that a handle can be dragged past the clip's edges. */
const clipMarginMs = 60_000;

/** The stretch of the file each waveform view loads, or null for a view with nothing to load. */
export type WaveformViews = Record<WaveformViewName, WaveformWindowView | null>;

const noViews: WaveformViews = { player: null, clip: null };

/**
 * Returns the stretch of the file that each waveform view of a media screen loads, given the file's length.
 * Only a file on the server's disk has peaks to load, and only once its length is known.
 * The player strip loads while the waveform panel is open; the clip view while the open flashcard has a clip.
 */
export function waveformViews(
  screen: MediaScreenState,
  durationMs: number,
): WaveformViews {
  if (screen.playback === null || durationMs <= 0) return noViews;
  return {
    player: screen.panels.waveform ? playerView(screen, durationMs) : null,
    clip: clipView(screen, durationMs),
  };
}

/** Returns the span the player strip shows: the zoomed span around the current time, kept within the file. */
function playerStripSpan(screen: MediaScreenState, durationMs: number) {
  const currentTimeMs = screen.playing.player.currentTimeSeconds * 1000;
  const spanMs = clampVisibleSpan(screen.waveform.requestedSpanMs, durationMs);
  const startMs = computeViewStart(currentTimeMs, spanMs, durationMs);
  return { currentTimeMs, startMs, spanMs };
}

function playerView(
  screen: MediaScreenState,
  durationMs: number,
): WaveformWindowView {
  const { currentTimeMs, startMs, spanMs } = playerStripSpan(
    screen,
    durationMs,
  );
  return {
    viewStartMs: startMs,
    viewEndMs: startMs + spanMs,
    focusMs: currentTimeMs,
    durationMs,
  };
}

function clipView(
  screen: MediaScreenState,
  durationMs: number,
): WaveformWindowView | null {
  const clip = screen.flashcardForm?.card.editor.content.audio_context ?? null;
  if (clip === null) return null;
  return {
    viewStartMs: Math.max(0, clip.start_ms - clipMarginMs),
    viewEndMs: Math.min(durationMs, clip.end_ms + clipMarginMs),
    focusMs: clip.start_ms,
    durationMs,
  };
}
