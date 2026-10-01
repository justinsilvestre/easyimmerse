import type { MediaFile } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import {
  createResolveMediaPlayback,
  readStoredFileBytes,
  readStoredFileText,
} from "./storedFileEffects.ts";

const server = { serverUrl: "http://127.0.0.1:8787", token: "secret" };

const createMedia = (source: MediaFile["source"]): MediaFile => ({
  id: "m1",
  name: "episode.mp4",
  kind: "video",
  source,
  duration_ms: null,
  subtitle_tracks: [],
  added_at: "2026-01-01T00:00:00Z",
});

describe("createResolveMediaPlayback", () => {
  it("resolves a direct playback of the server's stream URL for media on disk", async () => {
    const media = createMedia({ kind: "path", path: "/episode.mp4" });
    expect(await createResolveMediaPlayback(server)("p1", media)).toEqual({
      kind: "direct",
      url: "http://127.0.0.1:8787/projects/p1/media/m1/stream?token=secret",
    });
  });

  it("rejects for media stored in a browser", async () => {
    const media = createMedia({ kind: "browser_file", key: "k1" });
    await expect(
      createResolveMediaPlayback(server)("p1", media),
    ).rejects.toThrow("episode.mp4");
  });
});

describe("readStoredFileText", () => {
  it("rejects", async () => {
    await expect(readStoredFileText()).rejects.toThrow("browser");
  });
});

describe("readStoredFileBytes", () => {
  it("rejects", async () => {
    await expect(readStoredFileBytes()).rejects.toThrow("browser");
  });
});
