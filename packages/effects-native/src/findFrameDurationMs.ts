import type { MediaTracks } from "@easyimmerse/types";

/** Returns how long one frame of the selected video track lasts in milliseconds, or undefined when its frame rate is unknown. */
export function findFrameDurationMs(tracks: MediaTracks): number | undefined {
  const videoId = tracks.selection.video;
  const video = tracks.container.tracks.find(
    (track) => track.kind === "video" && track.id === videoId,
  );
  const frameRate = video?.video?.frame_rate;
  if (!frameRate) return undefined;
  return (frameRate.denominator * 1000) / frameRate.numerator;
}
