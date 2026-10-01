// @vitest-environment node
// Node's own File survives IndexedDB's structured cloning; happy-dom's File does not.
import "fake-indexeddb/auto";
import type { MediaFile } from "@easyimmerse/types";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createReadStoredFileBytes,
  createReadStoredFileText,
  createResolveMediaPlayback,
} from "./browserFileEffects.ts";
import { createBrowserFileStore } from "./browserFileStore.ts";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

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
  it("resolves a direct playback for media stored in the browser", async () => {
    const store = createBrowserFileStore();
    const key = await store.put(new File(["video"], "episode.mp4"));
    const resolve = createResolveMediaPlayback(store);
    const playback = await resolve(
      "p1",
      createMedia({ kind: "browser_file", key }),
    );
    expect(playback.kind).toBe("direct");
  });

  it("resolves an object URL for media stored in the browser", async () => {
    const store = createBrowserFileStore();
    const key = await store.put(new File(["video"], "episode.mp4"));
    const resolve = createResolveMediaPlayback(store);
    const { url } = await resolve(
      "p1",
      createMedia({ kind: "browser_file", key }),
    );
    expect(url.startsWith("blob:")).toBe(true);
  });

  it("revokes the previous object URL when resolving the next", async () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    const store = createBrowserFileStore();
    const key = await store.put(new File(["video"], "episode.mp4"));
    const resolve = createResolveMediaPlayback(store);
    const { url: first } = await resolve(
      "p1",
      createMedia({ kind: "browser_file", key }),
    );
    await resolve("p1", createMedia({ kind: "browser_file", key }));
    expect(revoke).toHaveBeenCalledWith(first);
  });

  it("rejects for media on disk", async () => {
    const resolve = createResolveMediaPlayback(createBrowserFileStore());
    const media = createMedia({ kind: "path", path: "/episode.mp4" });
    await expect(resolve("p1", media)).rejects.toThrow("episode.mp4");
  });

  it("rejects for media the browser no longer holds", async () => {
    const resolve = createResolveMediaPlayback(createBrowserFileStore());
    const media = createMedia({ kind: "browser_file", key: "missing" });
    await expect(resolve("p1", media)).rejects.toThrow("not stored");
  });
});

describe("createReadStoredFileText", () => {
  it("reads the text of a stored file", async () => {
    const store = createBrowserFileStore();
    const key = await store.put(new File(["WEBVTT"], "episode.vtt"));
    expect(await createReadStoredFileText(store)(key)).toBe("WEBVTT");
  });

  it("rejects for an unknown key", async () => {
    const read = createReadStoredFileText(createBrowserFileStore());
    await expect(read("missing")).rejects.toThrow("no longer stored");
  });
});

describe("createReadStoredFileBytes", () => {
  it("reads the bytes of a stored file", async () => {
    const store = createBrowserFileStore();
    const key = await store.put(new File([new Uint8Array([1, 2, 3])], "a.zip"));
    expect(await createReadStoredFileBytes(store)(key)).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });

  it("rejects for an unknown key", async () => {
    const read = createReadStoredFileBytes(createBrowserFileStore());
    await expect(read("missing")).rejects.toThrow("no longer stored");
  });
});
