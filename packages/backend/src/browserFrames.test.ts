import { createBrowserFileRegistry } from "@easyimmerse/state";
import type { MediaFileSource } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { captureFrame, probePictures } from "./browserFrames.ts";
import type { FrameCapturer } from "./frameCapturer.ts";
import type { BackendThunkExtra } from "./injectedBaseQuery.ts";

type Asked = { file: Blob; atMs?: number };

/** A capturer that records what it is asked for and answers from the given frame and pictures answer. */
function createRecordingCapturer(
  frame: string | null | undefined,
  hasPictures = true,
) {
  const asked: Asked[] = [];
  const capturer: FrameCapturer = {
    capture: async (file, atMs) => {
      asked.push({ file, atMs });
      return frame;
    },
    probe: async (file) => {
      asked.push({ file });
      return hasPictures;
    },
  };
  return { asked, capturer };
}

function extraWith(
  browserFileRegistry: BackendThunkExtra["browserFileRegistry"],
  frameCapturer: FrameCapturer | null,
): BackendThunkExtra {
  return {
    client: { send: async () => ({ data: null as never }) },
    browserFileRegistry,
    frameCapturer,
    failedPassages: { retryTimes: {} },
  };
}

function heldVideo(capturer: FrameCapturer) {
  const registry = createBrowserFileRegistry<File>();
  const held = new File(["video"], "clip.mp4", { lastModified: 5 });
  const file = { name: "clip.mp4", source: registry.register(held) };
  return { held, file, extra: extraWith(registry, capturer) };
}

const goneVideo = {
  name: "clip.mp4",
  source: {
    kind: "browser_file",
    size: 5,
    last_modified_ms: 5,
  } as MediaFileSource,
};

describe("captureFrame", () => {
  it("answers with the frame the capturer draws", async () => {
    const { file, extra } = heldVideo(
      createRecordingCapturer("frame").capturer,
    );
    expect(await captureFrame({ file, atMs: 1000 }, extra)).toEqual({
      data: { file, url: "frame" },
    });
  });

  it("asks the capturer for the held file at the time", async () => {
    const { asked, capturer } = createRecordingCapturer("frame");
    const { held, file, extra } = heldVideo(capturer);
    await captureFrame({ file, atMs: 1000 }, extra);
    expect(asked).toEqual([{ file: held, atMs: 1000 }]);
  });

  it("answers null for a frame that cannot be drawn", async () => {
    const { file, extra } = heldVideo(createRecordingCapturer(null).capturer);
    expect(await captureFrame({ file, atMs: 1000 }, extra)).toEqual({
      data: { file, url: null },
    });
  });

  it("fails a capture superseded by a later one", async () => {
    const { capturer } = createRecordingCapturer(undefined);
    const { file, extra } = heldVideo(capturer);
    const result = await captureFrame({ file, atMs: 1000 }, extra);
    expect(result.error?.code).toBe("frameCaptureSuperseded");
  });

  it("fails on a platform without a capturer", async () => {
    const registry = createBrowserFileRegistry<File>();
    const file = {
      name: "clip.mp4",
      source: registry.register(new File(["video"], "clip.mp4")),
    };
    const result = await captureFrame(
      { file, atMs: 1000 },
      extraWith(registry, null),
    );
    expect(result.error?.code).toBe("browserFileUnreachable");
  });

  it("fails for a file the browser no longer holds", async () => {
    const extra = extraWith(
      createBrowserFileRegistry<File>(),
      createRecordingCapturer("frame").capturer,
    );
    const result = await captureFrame({ file: goneVideo, atMs: 1000 }, extra);
    expect(result.error?.code).toBe("browserFileGone");
  });
});

describe("probePictures", () => {
  it("answers whether the held file shows pictures", async () => {
    const { capturer } = createRecordingCapturer("frame", false);
    const { file, extra } = heldVideo(capturer);
    expect(await probePictures(file, extra)).toEqual({ data: false });
  });

  it("asks the capturer to probe the held file", async () => {
    const { asked, capturer } = createRecordingCapturer("frame");
    const { held, file, extra } = heldVideo(capturer);
    await probePictures(file, extra);
    expect(asked).toEqual([{ file: held }]);
  });

  it("fails on a platform without browser files", async () => {
    const result = await probePictures(goneVideo, extraWith(null, null));
    expect(result.error?.code).toBe("browserFileUnreachable");
  });

  it("fails for a file the browser no longer holds", async () => {
    const extra = extraWith(
      createBrowserFileRegistry<File>(),
      createRecordingCapturer("frame").capturer,
    );
    const result = await probePictures(goneVideo, extra);
    expect(result.error?.code).toBe("browserFileGone");
  });
});
