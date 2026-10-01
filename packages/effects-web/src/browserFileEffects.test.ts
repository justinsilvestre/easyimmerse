import type { MediaFile } from "@easyimmerse/types";
import { describe, expect, it, vi } from "vitest";
import {
  createReadStoredFileText,
  createResolveMediaUrl,
} from "./browserFileEffects.ts";
import { createBrowserFileStore } from "./browserFileStore.ts";

const createMedia = (source: MediaFile["source"]): MediaFile => ({
  id: "m1",
  name: "episode.mp4",
  kind: "video",
  source,
  duration_ms: null,
  subtitle_tracks: [],
  added_at: "2026-01-01T00:00:00Z",
});

describe("createResolveMediaUrl", () => {
  it("resolves an object URL for media stored in the browser", async () => {
    const store = createBrowserFileStore();
    const key = store.put(new File(["video"], "episode.mp4"));
    const resolve = createResolveMediaUrl(store);
    const url = await resolve("p1", createMedia({ kind: "browser_file", key }));
    expect(url.startsWith("blob:")).toBe(true);
  });

  it("revokes the previous object URL when resolving the next", async () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    const store = createBrowserFileStore();
    const key = store.put(new File(["video"], "episode.mp4"));
    const resolve = createResolveMediaUrl(store);
    const first = await resolve(
      "p1",
      createMedia({ kind: "browser_file", key }),
    );
    await resolve("p1", createMedia({ kind: "browser_file", key }));
    expect(revoke).toHaveBeenCalledWith(first);
  });

  it("rejects for media on disk", async () => {
    const resolve = createResolveMediaUrl(createBrowserFileStore());
    const media = createMedia({ kind: "path", path: "/episode.mp4" });
    await expect(resolve("p1", media)).rejects.toThrow("episode.mp4");
  });
});

describe("createReadStoredFileText", () => {
  it("reads the text of a stored file", async () => {
    const store = createBrowserFileStore();
    const key = store.put(new File(["WEBVTT"], "episode.vtt"));
    expect(await createReadStoredFileText(store)(key)).toBe("WEBVTT");
  });

  it("rejects for an unknown key", async () => {
    const read = createReadStoredFileText(createBrowserFileStore());
    await expect(read("missing")).rejects.toThrow("no longer stored");
  });
});
