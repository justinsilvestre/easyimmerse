import type { TrackInfo } from "@easyimmerse/types";
import type { TrackChoice } from "../components/trackChoiceLabels.ts";

const codecNames: Record<string, string> = {
  h264: "H.264",
  hevc: "HEVC",
  vp8: "VP8",
  vp9: "VP9",
  av1: "AV1",
  mpeg4: "MPEG-4",
  mpeg2video: "MPEG-2",
  aac: "AAC",
  ac3: "AC-3",
  eac3: "E-AC-3",
  dts: "DTS",
  truehd: "TrueHD",
  flac: "FLAC",
  opus: "Opus",
  vorbis: "Vorbis",
  mp3: "MP3",
  pcm_s16le: "PCM",
};

const channelLayouts: Record<number, string> = {
  1: "mono",
  2: "stereo",
  6: "5.1",
  8: "7.1",
};

/** Describes a probed track as the track choice dialog shows it. */
export function trackChoiceOf(track: TrackInfo): TrackChoice {
  return {
    streamIndex: track.index,
    language: track.language,
    title: track.title,
    format: describeTrackFormat(track),
    isDefault: track.is_default,
  };
}

/** A line such as `H.264 1920×1080` or `AAC stereo`. */
export function describeTrackFormat(track: TrackInfo): string {
  const codec = codecNames[track.codec] ?? track.codec.toUpperCase();
  const detail =
    track.kind === "video" ? pictureSize(track) : channelLayout(track.channels);
  return detail === null ? codec : `${codec} ${detail}`;
}

function pictureSize(track: TrackInfo): string | null {
  if (track.width === null || track.height === null) return null;
  return `${track.width}×${track.height}`;
}

function channelLayout(channels: number | null): string | null {
  if (channels === null) return null;
  return channelLayouts[channels] ?? `${channels} channels`;
}
