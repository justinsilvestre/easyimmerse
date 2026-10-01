import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { openAppDatabase, request } from "./openAppDatabase.ts";
import { createPreferenceStore } from "./preferenceStore.ts";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

/** Writes a preference the way the first version of the app did, before files were stored. */
async function savePreferenceInFirstVersion(
  key: string,
  value: string,
): Promise<void> {
  const opening = indexedDB.open("easyimmerse", 1);
  opening.addEventListener("upgradeneeded", () => {
    opening.result.createObjectStore("preferences");
  });
  const database = await request(opening);
  const store = database
    .transaction("preferences", "readwrite")
    .objectStore("preferences");
  await request(store.put(value, key));
  database.close();
}

describe("openAppDatabase", () => {
  it("creates the files store in a new database", async () => {
    const database = await openAppDatabase();
    expect(database.objectStoreNames.contains("files")).toBe(true);
  });

  it("adds the files store when upgrading the first version", async () => {
    await savePreferenceInFirstVersion("showTranslations", "true");
    const database = await openAppDatabase();
    expect(database.objectStoreNames.contains("files")).toBe(true);
  });

  it("keeps preferences saved before the upgrade", async () => {
    await savePreferenceInFirstVersion("showTranslations", "true");
    expect(await createPreferenceStore().load("showTranslations")).toBe("true");
  });
});
