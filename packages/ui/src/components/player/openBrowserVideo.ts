import type { OpenedVideo } from "./browserFrameCapturer.ts";

/** The browser features that opening a video uses, so that tests can pass fakes. */
export type BrowserVideoPlatform = {
  createVideo: () => HTMLVideoElement;
  createObjectURL: (file: Blob) => string;
  revokeObjectURL: (url: string) => void;
};

const documentPlatform: BrowserVideoPlatform = {
  createVideo: () => document.createElement("video"),
  createObjectURL: (file) => URL.createObjectURL(file),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
};

/** How long a file may take to show its first frame before it is treated as unreadable. */
export const openTimeoutMs = 10_000;

/**
 * Loads the file into a muted video element that is never added to the page, from a blob URL of its own.
 * Resolves once the first frame has loaded, or null when the file shows no pictures, cannot be read, or takes too long.
 * Closing the video, or failing to open it, revokes the blob URL.
 */
export function openBrowserVideo(
  file: Blob,
  platform = documentPlatform,
): Promise<OpenedVideo | null> {
  const video = platform.createVideo();
  const url = platform.createObjectURL(file);
  const close = () => {
    video.removeAttribute("src");
    platform.revokeObjectURL(url);
  };
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      video.removeEventListener("loadeddata", finish);
      video.removeEventListener("error", finish);
      if (video.readyState >= 2 && video.videoWidth > 0)
        return resolve({ element: video, close });
      close();
      resolve(null);
    };
    const timer = setTimeout(finish, openTimeoutMs);
    video.addEventListener("loadeddata", finish);
    video.addEventListener("error", finish);
    video.muted = true;
    video.preload = "auto";
    video.src = url;
  });
}
