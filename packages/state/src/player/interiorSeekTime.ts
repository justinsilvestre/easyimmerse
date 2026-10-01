/** The frame duration assumed when the media's frame rate is unknown: one sixtieth of a second. */
const fallbackFrameDurationMs = 1000 / 60;

/**
 * Returns a time half a frame after the given one, in milliseconds.
 * A seek to a moment such as a cue start lands there, so that it never falls on the boundary between two frames, where players disagree about which frame to show.
 */
export function interiorSeekTime(
  ms: number,
  frameDurationMs: number | undefined,
): number {
  return ms + (frameDurationMs ?? fallbackFrameDurationMs) / 2;
}
