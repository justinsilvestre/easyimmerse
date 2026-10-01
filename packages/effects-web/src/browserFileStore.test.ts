import { describe, expect, it } from "vitest";
import { createBrowserFileStore } from "./browserFileStore.ts";

describe("createBrowserFileStore", () => {
  it("returns a stored file by its key", () => {
    const store = createBrowserFileStore();
    const file = new File(["Hi"], "episode.srt");
    expect(store.get(store.put(file))).toBe(file);
  });

  it("gives each stored file its own key", () => {
    const store = createBrowserFileStore();
    const file = new File(["Hi"], "episode.srt");
    expect(store.put(file)).not.toBe(store.put(file));
  });

  it("returns undefined for an unknown key", () => {
    expect(createBrowserFileStore().get("missing")).toBeUndefined();
  });
});
