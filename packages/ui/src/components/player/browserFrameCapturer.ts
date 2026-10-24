import type { FrameCapturer } from "@easyimmerse/backend";
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
 * Creates a capturer that runs one file operation at a time and keeps one video open while operations wait.
 * It remembers which files show pictures, so that a file without them is opened only once.
 */
export function createFrameCapturer(
  platform: FrameCapturerPlatform,
): FrameCapturer {
  const picturesByFile = new WeakMap<Blob, boolean>();
  let queue: Promise<unknown> = Promise.resolve();
  let waitingCount = 0;
  let opened: { file: Blob; video: OpenedVideo | null } | null = null;

  const videoOf = async (file: Blob) => {
    if (opened?.file !== file) {
      opened?.video?.close();
      opened = { file, video: await platform.openVideo(file) };
      picturesByFile.set(file, opened.video !== null);
    }
    return opened.video;
  };
  const probeNow = async (file: Blob) =>
    picturesByFile.get(file) ?? (await videoOf(file)) !== null;
  const captureNow = async (file: Blob, atMs: number) => {
    const video =
      picturesByFile.get(file) === false ? null : await videoOf(file);
    if (video === null) return null;
    return platform.captureFrame(video.element, atMs / 1000).catch(() => null);
  };
  const release = () => {
    opened?.video?.close();
    opened = null;
  };
  /** Runs the operation after those asked for before it, and releases the video once none waits. */
  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    waitingCount += 1;
    const turn = queue.then(async () => {
      try {
        return await operation();
      } finally {
        waitingCount -= 1;
        if (waitingCount === 0) release();
      }
    });
    queue = turn.catch(() => undefined);
    return turn;
  };
  return {
    capture: (file, atMs, isAbandoned) =>
      enqueue(async () => (isAbandoned() ? undefined : captureNow(file, atMs))),
    probe: (file) => enqueue(() => probeNow(file)),
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
