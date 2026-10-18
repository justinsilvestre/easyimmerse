import type { PlaybackProbes } from "@easyimmerse/state";

/** Reads the probes from the page: the navigator, a detached video element, and the MediaSource API. */
export function readPlaybackProbes(): PlaybackProbes {
  const video = document.createElement("video");
  const mediaSource = findMediaSource();
  return {
    userAgent: navigator.userAgent,
    canPlayType: (mimeType) => video.canPlayType(mimeType),
    isTypeSupported:
      mediaSource === null
        ? null
        : (mimeType) => mediaSource.isTypeSupported(mimeType),
  };
}

type MediaSourceLike = { isTypeSupported: (mimeType: string) => boolean };

/** hls.js prefers ManagedMediaSource where it exists (iOS Safari), so its answers count there. */
function findMediaSource(): MediaSourceLike | null {
  const candidates = window as unknown as {
    ManagedMediaSource?: MediaSourceLike;
    MediaSource?: MediaSourceLike;
  };
  return candidates.ManagedMediaSource ?? candidates.MediaSource ?? null;
}
