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
    expect(await capturer.capture(videoFile(), 2500, () => false)).toBe(
      "frame-at-2.5",
    );
  });

  it("finds no frame in a file without pictures", async () => {
    const capturer = createFrameCapturer(createFakePlatform());
    expect(await capturer.capture(new Blob([]), 2500, () => false)).toBeNull();
  });

  it("opens a file without pictures only once", async () => {
    const platform = createFakePlatform();
    const capturer = createFrameCapturer(platform);
    const file = new Blob([]);
    await capturer.capture(file, 2500, () => false);
    await capturer.capture(file, 9000, () => false);
    expect(platform.opened).toHaveLength(1);
  });

  it("finds no frame when drawing it fails", async () => {
    const capturer = createFrameCapturer({
      ...createFakePlatform(),
      captureFrame: () => Promise.reject(new Error("The canvas is tainted.")),
    });
    expect(await capturer.capture(videoFile(), 2500, () => false)).toBeNull();
  });

  it("closes the video once no capture is waiting", async () => {
    const platform = createFakePlatform();
    const capturer = createFrameCapturer(platform);
    const file = videoFile();
    await Promise.all([
      capturer.probe(file),
      capturer.capture(file, 1000, () => false),
    ]);
    expect(platform.closed).toEqual([file]);
  });

  it("skips a capture abandoned before its turn", async () => {
    const platform = createFakePlatform();
    const capturer = createFrameCapturer(platform);
    const file = videoFile();
    let isAbandoned = false;
    const first = capturer.capture(file, 1000, () => false);
    const skipped = capturer.capture(file, 2000, () => isAbandoned);
    isAbandoned = true;
    await Promise.all([first, skipped]);
    expect(platform.captured).toEqual([1]);
  });

  it("resolves an abandoned capture with no answer", async () => {
    const capturer = createFrameCapturer(createFakePlatform());
    expect(
      await capturer.capture(videoFile(), 2000, () => true),
    ).toBeUndefined();
  });

  describe("when probing a file for pictures", () => {
    it("finds pictures in a video", async () => {
      const capturer = createFrameCapturer(createFakePlatform());
      expect(await capturer.probe(videoFile())).toBe(true);
    });

    it("finds no pictures in a file without them", async () => {
      const capturer = createFrameCapturer(createFakePlatform());
      expect(await capturer.probe(new Blob([]))).toBe(false);
    });

    it("answers from what a capture found without opening the file again", async () => {
      const platform = createFakePlatform();
      const capturer = createFrameCapturer(platform);
      const file = videoFile();
      await capturer.capture(file, 1000, () => false);
      await capturer.probe(file);
      expect(platform.opened).toHaveLength(1);
    });

    it("opens a probed file only once for a capture asked for together", async () => {
      const platform = createFakePlatform();
      const capturer = createFrameCapturer(platform);
      const file = videoFile();
      await Promise.all([
        capturer.probe(file),
        capturer.capture(file, 1000, () => false),
      ]);
      expect(platform.opened).toHaveLength(1);
    });
  });
});
