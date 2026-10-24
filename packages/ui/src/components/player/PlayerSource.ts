/** Where a media element gets its bytes: a URL it loads itself, or an HLS playlist that hls.js feeds it. */
export type PlayerSource =
  | { kind: "direct"; url: string }
  | { kind: "hls"; url: string; authorization: string };
