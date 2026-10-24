import type Hls from "hls.js";

export type HlsClass = typeof Hls;

/** Loads hls.js on first use, so that direct playback never pays for it. */
export function loadHls(): Promise<HlsClass> {
  return import("hls.js").then((module) => module.default);
}
