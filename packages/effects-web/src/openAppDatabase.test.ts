import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import {
  openAppDatabase,
  openAppDatabaseOnFirstUse,
  request,
} from "./openAppDatabase.ts";
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

  it("closes its connection so a newer version can upgrade the database", async () => {
    await openAppDatabase();
    const upgraded = await request(indexedDB.open("easyimmerse", 3));
    expect(upgraded.version).toBe(3);
  });
});

describe("openAppDatabaseOnFirstUse", () => {
  it("reuses the connection while it stays open", async () => {
    const open = openAppDatabaseOnFirstUse();
    expect(await open()).toBe(await open());
  });

  it("opens a new connection after the old one closed for a deletion", async () => {
    const open = openAppDatabaseOnFirstUse();
    const first = await open();
    await request(indexedDB.deleteDatabase("easyimmerse"));
    expect(await open()).not.toBe(first);
  });

  it("retries the opening after it failed", async () => {
    const open = openAppDatabaseOnFirstUse();
    const newer = await request(indexedDB.open("easyimmerse", 3));
    await open().catch(() => {});
    newer.close();
    await request(indexedDB.deleteDatabase("easyimmerse"));
    expect((await open()).version).toBe(2);
  });
});
