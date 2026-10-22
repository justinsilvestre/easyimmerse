import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { createPreferenceStore } from "./preferenceStore.ts";
import { createScopedPreferenceStore } from "./scopedPreferenceStore.ts";

const server = { serverUrl: "https://books.example.org", token: "secret" };

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

/** A fetch that records each request URL and answers that the save succeeded. */
function answering() {
  const sentUrls: string[] = [];
  const fetchFn: typeof fetch = async (input) => {
    sentUrls.push(String(input));
    return new Response(null, { status: 204 });
  };
  return { sentUrls, fetchFn };
}

describe("createScopedPreferenceStore", () => {
  describe("with a server", () => {
    it("saves a preference that follows the person on the server", async () => {
      const { sentUrls, fetchFn } = answering();
      const store = createScopedPreferenceStore(
        server,
        createPreferenceStore(),
        fetchFn,
      );
      await store.save("showTranslations", "true");
      expect(sentUrls).toEqual([
        "https://books.example.org/preferences/showTranslations",
      ]);
    });

    it("saves a preference that stays with the device on the device", async () => {
      const { fetchFn } = answering();
      const store = createScopedPreferenceStore(
        server,
        createPreferenceStore(),
        fetchFn,
      );
      await store.save("theme", "dark");
      expect(await createPreferenceStore().load("theme")).toBe("dark");
    });

    it("sends nothing to the server for a preference that stays with the device", async () => {
      const { sentUrls, fetchFn } = answering();
      const store = createScopedPreferenceStore(
        server,
        createPreferenceStore(),
        fetchFn,
      );
      await store.save("theme", "dark");
      expect(sentUrls).toEqual([]);
    });
  });

  describe("without a server", () => {
    it("saves a preference that follows the person on the device", async () => {
      const { fetchFn } = answering();
      const store = createScopedPreferenceStore(
        null,
        createPreferenceStore(),
        fetchFn,
      );
      await store.save("showTranslations", "true");
      expect(await createPreferenceStore().load("showTranslations")).toBe(
        "true",
      );
    });

    it("saves a preference that stays with the device on the device", async () => {
      const { fetchFn } = answering();
      const store = createScopedPreferenceStore(
        null,
        createPreferenceStore(),
        fetchFn,
      );
      await store.save("theme", "dark");
      expect(await createPreferenceStore().load("theme")).toBe("dark");
    });

    it("sends nothing to any server", async () => {
      const { sentUrls, fetchFn } = answering();
      const store = createScopedPreferenceStore(
        null,
        createPreferenceStore(),
        fetchFn,
      );
      await store.save("showTranslations", "true");
      expect(sentUrls).toEqual([]);
    });
  });
});
