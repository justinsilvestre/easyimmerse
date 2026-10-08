/** How far playback moves between two saves of its position, so that a long session does not write on every tick. */
const saveIntervalSeconds = 15;

/** The preference under which the playback position in a media file is stored, in milliseconds. */
export function playbackPositionKey(mediaFileId: string): string {
  return `playbackPosition:${mediaFileId}`;
}

/** Reads a stored playback position in milliseconds, or returns null when none is stored or it is malformed. */
export function parsePlaybackPosition(value: string | null): number | null {
  if (value === null) return null;
  const ms = Number(value);
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

/** Tells whether playback has moved into a new stretch since the last tick, which is when its position is worth saving. */
export function crossesSaveInterval(
  previousSeconds: number,
  seconds: number,
): boolean {
  return (
    Math.floor(previousSeconds / saveIntervalSeconds) !==
    Math.floor(seconds / saveIntervalSeconds)
  );
}
