import type { ServerConfig } from "@easyimmerse/backend";
import type { MediaPlayback } from "@easyimmerse/state";
import type { PlaybackResponse, UnsupportedReason } from "@easyimmerse/types";

/** Turns the server's playback plan into what the player loads. Throws a readable reason when the file cannot play. */
export function mediaPlaybackFromResponse(
  { plan, playlist_path }: PlaybackResponse,
  server: ServerConfig,
  directUrl: string,
): MediaPlayback {
  switch (plan.kind) {
    case "direct":
      return { kind: "direct", url: directUrl };
    case "convert":
      return buildHlsPlayback(server, playlist_path);
    case "unsupported":
      throw new Error(describeUnsupportedReason(plan.reason));
  }
}

function buildHlsPlayback(
  server: ServerConfig,
  playlistPath: string | null,
): MediaPlayback {
  if (playlistPath === null)
    throw new Error("The server planned a conversion but sent no playlist.");
  const url = new URL(playlistPath, server.serverUrl).toString();
  return { kind: "hls", url, token: server.token };
}

function describeUnsupportedReason(reason: UnsupportedReason): string {
  switch (reason) {
    case "no_tracks_selected":
      return "This file has no video or audio track to play.";
    case "track_not_found":
      return "The selected track is not in this file.";
    case "video_codec_unsupported":
      return "This system cannot play the file's video codec, and easyImmerse cannot convert video yet.";
    case "audio_codec_unsupported":
      return "This system cannot play the file's audio codec, and easyImmerse cannot convert it.";
    case "conversion_unavailable":
      return "This file must be converted to play, but conversion is not available on this server.";
  }
}
