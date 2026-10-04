import { describe, expect, it, vi } from "vitest";
import type { FrameSource } from "./captureVideoFrame.ts";
import { captureVideoFrame } from "./captureVideoFrame.ts";

type FakeVideo = FrameSource & {
  fireSeeked: () => void;
  seekedListeners: number;
};

function createFakeVideo(): FakeVideo {
  const listeners = new Set<() => void>();
  return {
    currentTime: 0,
    videoWidth: 320,
    videoHeight: 180,
    addEventListener: (_type, listener) => void listeners.add(listener),
    removeEventListener: (_type, listener) => void listeners.delete(listener),
    fireSeeked: () => {
      for (const listener of listeners) listener();
    },
    get seekedListeners() {
      return listeners.size;
    },
  };
}

function createFakeCanvas() {
  const drawn: unknown[] = [];
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: (source: unknown) => drawn.push(source) }),
    toDataURL: () => `data:image/jpeg;base64,${canvas.width}x${canvas.height}`,
  };
  return { canvas: canvas as unknown as HTMLCanvasElement, drawn };
}

describe("captureVideoFrame", () => {
  it("draws the current frame without a seek", async () => {
    const video = createFakeVideo();
    const { canvas, drawn } = createFakeCanvas();
    await captureVideoFrame(video, { createCanvas: () => canvas });
    expect(drawn).toEqual([video]);
  });

  it("sizes the canvas to the video's picture", async () => {
    const { canvas } = createFakeCanvas();
    const dataUrl = await captureVideoFrame(createFakeVideo(), {
      createCanvas: () => canvas,
    });
    expect(dataUrl).toBe("data:image/jpeg;base64,320x180");
  });

  it("seeks the video to the asked time", async () => {
    const video = createFakeVideo();
    const { canvas } = createFakeCanvas();
    const capture = captureVideoFrame(video, {
      seekToSeconds: 12.5,
      createCanvas: () => canvas,
    });
    video.fireSeeked();
    await capture;
    expect(video.currentTime).toBe(12.5);
  });

  it("waits for the seeked event before drawing", async () => {
    const video = createFakeVideo();
    const { canvas, drawn } = createFakeCanvas();
    const capture = captureVideoFrame(video, {
      seekToSeconds: 1,
      createCanvas: () => canvas,
    });
    await Promise.resolve();
    const drawnBeforeSeeked = drawn.length;
    video.fireSeeked();
    await capture;
    expect([drawnBeforeSeeked, drawn.length]).toEqual([0, 1]);
  });

  it("draws anyway when the seek times out", async () => {
    vi.useFakeTimers();
    try {
      const video = createFakeVideo();
      const { canvas, drawn } = createFakeCanvas();
      const capture = captureVideoFrame(video, {
        seekToSeconds: 1,
        seekTimeoutMs: 50,
        createCanvas: () => canvas,
      });
      await vi.advanceTimersByTimeAsync(50);
      await capture;
      expect(drawn).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("removes its seeked listener afterwards", async () => {
    const video = createFakeVideo();
    const { canvas } = createFakeCanvas();
    const capture = captureVideoFrame(video, {
      seekToSeconds: 1,
      createCanvas: () => canvas,
    });
    video.fireSeeked();
    await capture;
    expect(video.seekedListeners).toBe(0);
  });
});
