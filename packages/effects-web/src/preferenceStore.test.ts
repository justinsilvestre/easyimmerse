import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { createPreferenceStore } from "./preferenceStore.ts";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe("createPreferenceStore", () => {
  it("loads null for a preference that was never saved", async () => {
    const store = createPreferenceStore();
    expect(await store.load("showTranslations")).toBeNull();
  });

  it("loads the value that was saved", async () => {
    const store = createPreferenceStore();
    await store.save("showTranslations", "true");
    expect(await store.load("showTranslations")).toBe("true");
  });

  it("keeps the value across store instances", async () => {
    await createPreferenceStore().save("showTranslations", "false");
    expect(await createPreferenceStore().load("showTranslations")).toBe(
      "false",
    );
  });
});
