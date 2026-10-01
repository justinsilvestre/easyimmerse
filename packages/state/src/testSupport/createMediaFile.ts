import type { MediaFile } from "@easyimmerse/types";

/** Builds a video file with no subtitle tracks, changed by the overrides. */
export function createMediaFile(overrides: Partial<MediaFile> = {}): MediaFile {
  return {
    id: "m1",
    name: "episode.mp4",
    kind: "video",
    source: { kind: "path", path: "/videos/episode.mp4" },
    duration_ms: 90_000,
    subtitle_tracks: [],
    added_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}
