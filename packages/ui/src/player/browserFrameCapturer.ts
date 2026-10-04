import { captureVideoFrame, type FrameSource } from "./captureVideoFrame.ts";
import { openBrowserVideo } from "./openBrowserVideo.ts";

/** A video element playing a file of its own, apart from the player, and the way to release it. */
export type OpenedVideo = { element: FrameSource; close: () => void };

/** How the capturer loads files and draws their frames, so that tests can pass a fake. */
export type FrameCapturerPlatform = {
  /** Loads the file into a video element of its own, or resolves null when the file shows no pictures or cannot be read. */
  openVideo: (file: Blob) => Promise<OpenedVideo | null>;
  /** Seeks the video to the time and returns its frame as an image URL. */
  captureFrame: (video: FrameSource, seconds: number) => Promise<string>;
};

/**
 * Captures frames from files the browser holds, one capture at a time.
 * A frame is an image URL, or null when the file has no pictures or its frame cannot be drawn.
 */
export type FrameCapturer = {
  /** The frame already captured at the time, or undefined when it has not been captured. */
  peek: (file: Blob, atMs: number) => string | null | undefined;
  /** Captures the frame at the time. Resolves undefined, without capturing, when the signal aborts before the capture's turn. */
  capture: (
    file: Blob,
    atMs: number,
    signal?: AbortSignal,
  ) => Promise<string | null | undefined>;
};

export function createFrameCapturer(
  platform: FrameCapturerPlatform,
): FrameCapturer {
  const framesByFile = new WeakMap<Blob, Map<number, string | null>>();
  const filesWithoutPictures = new WeakSet<Blob>();
  let queue: Promise<unknown> = Promise.resolve();
  let waitingCount = 0;
  let opened: { file: Blob; video: OpenedVideo | null } | null = null;

  const peek = (file: Blob, atMs: number) =>
    filesWithoutPictures.has(file) ? null : framesByFile.get(file)?.get(atMs);
  const videoOf = async (file: Blob) => {
    if (opened?.file !== file) {
      opened?.video?.close();
      opened = { file, video: await platform.openVideo(file) };
    }
    return opened.video;
  };
  const captureNow = async (file: Blob, atMs: number) => {
    const known = peek(file, atMs);
    if (known !== undefined) return known;
    const video = await videoOf(file);
    if (video === null) {
      filesWithoutPictures.add(file);
      return null;
    }
    const frame = await platform
      .captureFrame(video.element, atMs / 1000)
      .catch(() => null);
    const frames = framesByFile.get(file) ?? new Map<number, string | null>();
    framesByFile.set(file, frames.set(atMs, frame));
    return frame;
  };
  const release = () => {
    opened?.video?.close();
    opened = null;
  };

  return {
    peek,
    capture: (file, atMs, signal) => {
      waitingCount += 1;
      const turn = queue.then(async () => {
        try {
          return signal?.aborted ? undefined : await captureNow(file, atMs);
        } finally {
          waitingCount -= 1;
          if (waitingCount === 0) release();
        }
      });
      queue = turn.catch(() => undefined);
      return turn;
    },
  };
}

/** The width the server's frame route scales screenshots down to, which browser captures match. */
const screenshotMaxWidthPx = 640;

/** The capturer for the files the web app holds, drawing frames from video elements outside the page. */
export const browserFrameCapturer = createFrameCapturer({
  openVideo: (file) => openBrowserVideo(file),
  captureFrame: (video, seconds) =>
    captureVideoFrame(video, {
      seekToSeconds: seconds,
      maxWidthPx: screenshotMaxWidthPx,
    }),
});
