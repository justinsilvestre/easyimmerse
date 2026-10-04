import type {
  ContainerInfo,
  PlaybackPlan,
  TrackInfo,
  TrackSelection,
} from "@easyimmerse/types";

/** Parses the selection a media file stores, or null when none is stored or it is malformed. */
export function parseTrackSelection(
  json: string | null,
): TrackSelection | null {
  if (json === null) return null;
  try {
    return toTrackSelection(JSON.parse(json));
  } catch {
    return null;
  }
}

function toTrackSelection(value: unknown): TrackSelection | null {
  if (typeof value !== "object" || value === null) return null;
  const { video, audio } = value as Partial<Record<string, unknown>>;
  if (!isIndexOrNull(video) || !isIndexOrNull(audio)) return null;
  return { video, audio };
}

function isIndexOrNull(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

export function tracksOfKind(
  container: ContainerInfo,
  kind: TrackInfo["kind"],
): TrackInfo[] {
  return container.tracks.filter((track) => track.kind === kind);
}

/** True when the user must choose: some kind has several tracks and no choice is saved. */
export function needsTrackChoice(
  container: ContainerInfo,
  savedSelection: TrackSelection | null,
): boolean {
  if (savedSelection !== null) return false;
  return (
    tracksOfKind(container, "video").length > 1 ||
    tracksOfKind(container, "audio").length > 1
  );
}

/** True when a converting plan copies every chosen track, so nothing is re-encoded. */
export function copiesChosenTracksOnly(plan: PlaybackPlan): boolean {
  if (plan.kind !== "convert") return false;
  return (
    (plan.video === null || plan.video.action === "copy") &&
    (plan.audio === null || plan.audio.action === "copy")
  );
}

/** The frame rate of the selected video track, or null for audio or an unknown rate. */
export function selectedFrameRate(
  container: ContainerInfo,
  selection: TrackSelection | null,
): TrackInfo["frame_rate"] {
  const videoTracks = tracksOfKind(container, "video");
  const chosen =
    selection === null
      ? (videoTracks.find((track) => track.is_default) ?? videoTracks[0])
      : videoTracks.find((track) => track.index === selection.video);
  return chosen?.frame_rate ?? null;
}

/** The codec strings of every track, for probing the browser's MSE support. */
export function containerCodecStrings(container: ContainerInfo): string[] {
  return container.tracks
    .map((track) => track.codec_string)
    .filter((codec): codec is string => codec !== null);
}
