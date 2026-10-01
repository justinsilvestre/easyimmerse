import type { MediaTracks, TrackInfo, TrackKind } from "@easyimmerse/types";

/** Builds a track for tests, with every detail unknown except its kind and codec string. */
export function createTestTrack(
  id: number,
  kind: TrackKind,
  codecString: string | null,
): TrackInfo {
  return {
    id,
    kind,
    codec: codecString ?? "unknown",
    profile: null,
    level: null,
    bit_rate: null,
    codec_string: codecString,
    language: null,
    title: null,
    is_default: false,
    video: null,
    audio: null,
  };
}

/** Builds, for tests, a Matroska file with the given tracks and the first video and audio track selected. */
export function createTestMediaTracks(tracks: TrackInfo[]): MediaTracks {
  const firstIdOf = (kind: TrackKind) =>
    tracks.find((track) => track.kind === kind)?.id ?? null;
  return {
    container: { format: "matroska", duration_ms: 1_560_000, tracks },
    selection: { video: firstIdOf("video"), audio: firstIdOf("audio") },
    direct_type: 'video/x-matroska; codecs="avc1.64001F, mp4a.6B"',
  };
}
