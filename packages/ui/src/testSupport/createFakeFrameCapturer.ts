import type { FrameCapturer } from "@easyimmerse/backend";
import { createFrameCapturer } from "../player/browserFrameCapturer.ts";
import type { FrameSource } from "../player/captureVideoFrame.ts";

/** A capturer whose files all show pictures or all show none, and whose frames are named after their time in seconds. */
export function createFakeFrameCapturer(hasPictures: boolean): FrameCapturer {
  return createFrameCapturer({
    openVideo: async () =>
      hasPictures
        ? { element: {} as FrameSource, close: () => undefined }
        : null,
    captureFrame: async (_video, seconds) => `frame-at-${seconds}`,
  });
}
