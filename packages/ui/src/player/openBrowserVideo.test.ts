import { describe, expect, it, vi } from "vitest";
import {
  type BrowserVideoPlatform,
  openBrowserVideo,
  openTimeoutMs,
} from "./openBrowserVideo.ts";

type FakePlatform = BrowserVideoPlatform & {
  video: HTMLVideoElement;
  revoked: string[];
};

/** A platform whose video reports the given picture width once it has loaded. */
function createFakePlatform(videoWidth: number): FakePlatform {
  const video = document.createElement("video");
  Object.defineProperty(video, "videoWidth", { value: videoWidth });
  const revoked: string[] = [];
  return {
    video,
    revoked,
    createVideo: () => video,
    createObjectURL: () => "blob:clip",
    revokeObjectURL: (url) => void revoked.push(url),
  };
}

function load(video: HTMLVideoElement) {
  Object.defineProperty(video, "readyState", { value: 2 });
  video.dispatchEvent(new Event("loadeddata"));
}

const file = new Blob(["video"]);

describe("openBrowserVideo", () => {
  it("plays the file from its blob URL", () => {
    const platform = createFakePlatform(320);
    void openBrowserVideo(file, platform);
    expect(platform.video.getAttribute("src")).toBe("blob:clip");
  });

  it("mutes the video", () => {
    const platform = createFakePlatform(320);
    void openBrowserVideo(file, platform);
    expect(platform.video.muted).toBe(true);
  });

  it("resolves the video once its first frame has loaded", async () => {
    const platform = createFakePlatform(320);
    const opening = openBrowserVideo(file, platform);
    load(platform.video);
    expect((await opening)?.element).toBe(platform.video);
  });

  it("keeps the blob URL while the video is open", async () => {
    const platform = createFakePlatform(320);
    const opening = openBrowserVideo(file, platform);
    load(platform.video);
    await opening;
    expect(platform.revoked).toEqual([]);
  });

  it("revokes the blob URL when the video is closed", async () => {
    const platform = createFakePlatform(320);
    const opening = openBrowserVideo(file, platform);
    load(platform.video);
    (await opening)?.close();
    expect(platform.revoked).toEqual(["blob:clip"]);
  });

  it("resolves null for a file without pictures", async () => {
    const platform = createFakePlatform(0);
    const opening = openBrowserVideo(file, platform);
    load(platform.video);
    expect(await opening).toBeNull();
  });

  it("revokes the blob URL of a file that cannot be read", async () => {
    const platform = createFakePlatform(320);
    const opening = openBrowserVideo(file, platform);
    platform.video.dispatchEvent(new Event("error"));
    await opening;
    expect(platform.revoked).toEqual(["blob:clip"]);
  });

  it("resolves null when the file takes too long to load", async () => {
    vi.useFakeTimers();
    try {
      const opening = openBrowserVideo(file, createFakePlatform(320));
      await vi.advanceTimersByTimeAsync(openTimeoutMs);
      expect(await opening).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
