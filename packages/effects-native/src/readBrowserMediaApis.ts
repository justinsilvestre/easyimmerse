import type { BrowserMediaApis } from "./measurePlaybackEnvironment.ts";

declare global {
  /** WebKit's variant of `MediaSource`, which TypeScript's DOM types do not declare yet. */
  var ManagedMediaSource: typeof MediaSource | undefined;
}

/** Reads the web view's media features. Prefers `ManagedMediaSource`, which WebKit offers where it lacks or restricts `MediaSource`. */
export function readBrowserMediaApis(): BrowserMediaApis {
  const video = document.createElement("video");
  const mediaSource = globalThis.ManagedMediaSource ?? globalThis.MediaSource;
  return {
    userAgent: navigator.userAgent,
    canPlayType: (mimeType) => video.canPlayType(mimeType),
    isTypeSupported: mediaSource
      ? (mimeType) => mediaSource.isTypeSupported(mimeType)
      : null,
  };
}
