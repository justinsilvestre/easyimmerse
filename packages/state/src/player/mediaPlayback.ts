/**
 * How the player loads a media file: directly from a URL, or as an HLS stream (HTTP Live Streaming) that the server converts while it plays.
 * The HLS stream's requests need the token as a bearer token.
 * The frame duration is in milliseconds, and is present when the media's frame rate is known.
 */
export type MediaPlayback =
  | { kind: "direct"; url: string; frameDurationMs?: number }
  | { kind: "hls"; url: string; token: string; frameDurationMs?: number };
