import { attachHls } from "./attachHls.ts";
import type { HlsClass } from "./loadHls.ts";
import { loadHls } from "./loadHls.ts";
import type { PlayerSource } from "./PlayerSource.ts";

export type AttachOptions = {
  /** The element time to continue from once the source has loaded, as after a track switch. */
  resumeAtSeconds?: number;
  onFailure: (cause: string) => void;
  /** Replaces the lazy hls.js import, for tests. */
  loadHlsClass?: () => Promise<HlsClass>;
};

/**
 * Points the media element at the source and returns a function that detaches it.
 * A direct source is set as `src`; an HLS source goes through hls.js once it has loaded.
 */
export function attachPlayerSource(
  element: HTMLMediaElement,
  source: PlayerSource,
  options: AttachOptions,
): () => void {
  const stopResuming = resumeWhenLoaded(element, options.resumeAtSeconds ?? 0);
  const detach =
    source.kind === "direct"
      ? attachDirect(element, source.url)
      : attachLazyHls(element, source, options);
  return () => {
    stopResuming();
    detach();
  };
}

function attachDirect(element: HTMLMediaElement, url: string): () => void {
  element.src = url;
  return () => {
    element.removeAttribute("src");
    element.load();
  };
}

function attachLazyHls(
  element: HTMLMediaElement,
  source: Extract<PlayerSource, { kind: "hls" }>,
  options: AttachOptions,
): () => void {
  let detached = false;
  let dispose: () => void = () => undefined;
  (options.loadHlsClass ?? loadHls)().then(
    (Hls) => {
      if (detached) return;
      dispose = attachHls(Hls, element, source, options.onFailure);
    },
    () => options.onFailure("The converted-media player could not be loaded."),
  );
  return () => {
    detached = true;
    dispose();
  };
}

function resumeWhenLoaded(element: HTMLMediaElement, seconds: number) {
  if (seconds <= 0) return () => undefined;
  const resume = () => {
    element.currentTime = seconds;
  };
  element.addEventListener("loadedmetadata", resume, { once: true });
  return () => element.removeEventListener("loadedmetadata", resume);
}
