// @vitest-environment node
// Node's own File survives IndexedDB's structured cloning; happy-dom's File does not.
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { createBrowserFileStore } from "./browserFileStore.ts";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe("createBrowserFileStore", () => {
  it("returns the contents of a stored file by its key", async () => {
    const store = createBrowserFileStore();
    const key = await store.put(new File(["Hi"], "episode.srt"));
    expect(await (await store.get(key))?.text()).toBe("Hi");
  });

  it("keeps stored files across store instances", async () => {
    const key = await createBrowserFileStore().put(
      new File(["Hi"], "episode.srt"),
    );
    expect(await createBrowserFileStore().get(key)).not.toBeNull();
  });

  it("gives each stored file its own key", async () => {
    const store = createBrowserFileStore();
    const file = new File(["Hi"], "episode.srt");
    expect(await store.put(file)).not.toBe(await store.put(file));
  });

  it("returns null for an unknown key", async () => {
    expect(await createBrowserFileStore().get("missing")).toBeNull();
  });

  it("returns null for a deleted file", async () => {
    const store = createBrowserFileStore();
    const key = await store.put(new File(["Hi"], "episode.srt"));
    await store.delete(key);
    expect(await store.get(key)).toBeNull();
  });

  it("lists the key, name and size of each stored file", async () => {
    const store = createBrowserFileStore();
    const key = await store.put(new File(["Hi"], "episode.srt"));
    expect(await store.list()).toEqual([{ key, name: "episode.srt", size: 2 }]);
  });

  it("totals the sizes of the stored files", async () => {
    const store = createBrowserFileStore();
    await store.put(new File(["Hi"], "episode.srt"));
    await store.put(new File(["video"], "episode.mp4"));
    expect(await store.totalBytes()).toBe(7);
  });
});
