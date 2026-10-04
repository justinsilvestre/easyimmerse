import { describe, expect, it } from "vitest";
import {
  createFrameCapturer,
  type FrameCapturerPlatform,
} from "./browserFrameCapturer.ts";
import type { FrameSource } from "./captureVideoFrame.ts";

type FakePlatform = FrameCapturerPlatform & {
  opened: Blob[];
  closed: Blob[];
  captured: number[];
};

/** A platform whose videos draw frames named after their seconds, and which treats empty files as having no pictures. */
function createFakePlatform(): FakePlatform {
  const opened: Blob[] = [];
  const closed: Blob[] = [];
  const captured: number[] = [];
  return {
    opened,
    closed,
    captured,
    openVideo: async (file) => {
      opened.push(file);
      if (file.size === 0) return null;
      return {
        element: {} as FrameSource,
        close: () => void closed.push(file),
      };
    },
    captureFrame: async (_video, seconds) => {
      captured.push(seconds);
      return `frame-at-${seconds}`;
    },
  };
}

const videoFile = () => new Blob(["video"]);

describe("createFrameCapturer", () => {
  it("captures the frame at the asked time", async () => {
    const capturer = createFrameCapturer(createFakePlatform());
    expect(await capturer.capture(videoFile(), 2500)).toBe("frame-at-2.5");
  });

  it("knows no frame before capturing it", () => {
    const capturer = createFrameCapturer(createFakePlatform());
    expect(capturer.peek(videoFile(), 2500)).toBeUndefined();
  });

  it("remembers a captured frame by file and time", async () => {
    const capturer = createFrameCapturer(createFakePlatform());
    const file = videoFile();
    await capturer.capture(file, 2500);
    expect(capturer.peek(file, 2500)).toBe("frame-at-2.5");
  });

  it("does not remember a frame for another file", async () => {
    const capturer = createFrameCapturer(createFakePlatform());
    await capturer.capture(videoFile(), 2500);
    expect(capturer.peek(videoFile(), 2500)).toBeUndefined();
  });

  it("captures a remembered frame only once", async () => {
    const platform = createFakePlatform();
    const capturer = createFrameCapturer(platform);
    const file = videoFile();
    await capturer.capture(file, 2500);
    await capturer.capture(file, 2500);
    expect(platform.captured).toEqual([2.5]);
  });

  it("finds no frame in a file without pictures", async () => {
    const capturer = createFrameCapturer(createFakePlatform());
    expect(await capturer.capture(new Blob([]), 2500)).toBeNull();
  });

  it("remembers that a file has no pictures at any time", async () => {
    const capturer = createFrameCapturer(createFakePlatform());
    const file = new Blob([]);
    await capturer.capture(file, 2500);
    expect(capturer.peek(file, 9000)).toBeNull();
  });

  it("finds no frame when drawing it fails", async () => {
    const capturer = createFrameCapturer({
      ...createFakePlatform(),
      captureFrame: () => Promise.reject(new Error("The canvas is tainted.")),
    });
    expect(await capturer.capture(videoFile(), 2500)).toBeNull();
  });

  it("opens a file once for captures asked for together", async () => {
    const platform = createFakePlatform();
    const capturer = createFrameCapturer(platform);
    const file = videoFile();
    await Promise.all([
      capturer.capture(file, 1000),
      capturer.capture(file, 2000),
    ]);
    expect(platform.opened).toHaveLength(1);
  });

  it("closes the video once no capture is waiting", async () => {
    const platform = createFakePlatform();
    const capturer = createFrameCapturer(platform);
    const file = videoFile();
    await Promise.all([
      capturer.capture(file, 1000),
      capturer.capture(file, 2000),
    ]);
    expect(platform.closed).toEqual([file]);
  });

  it("skips a capture whose signal aborted before its turn", async () => {
    const platform = createFakePlatform();
    const capturer = createFrameCapturer(platform);
    const file = videoFile();
    const controller = new AbortController();
    const first = capturer.capture(file, 1000);
    const skipped = capturer.capture(file, 2000, controller.signal);
    controller.abort();
    await Promise.all([first, skipped]);
    expect(platform.captured).toEqual([1]);
  });

  it("resolves a skipped capture with no answer", async () => {
    const capturer = createFrameCapturer(createFakePlatform());
    const controller = new AbortController();
    controller.abort();
    expect(
      await capturer.capture(videoFile(), 2000, controller.signal),
    ).toBeUndefined();
  });
});
