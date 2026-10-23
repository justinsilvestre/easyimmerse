import { describe, expect, it } from "vitest";
import { createAppStore } from "../app/createAppStore.ts";
import { createFakeServerStoreParts } from "../app/createFakeServerStoreParts.ts";
import { createNew, openM1 } from "../flashcards/flashcardsTestSupport.ts";
import { selectNotices } from "../notices/noticesSelectors.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";

/** Creates a store connected to an account's server, saves a new flashcard, and lets the server fail the save. */
async function storeAfterFailedSave() {
  const parts = createFakeServerStoreParts({
    serverUrl: "https://books.example.org",
    token: "t",
  });
  const store = createAppStore(createRecordingEffects(), parts);
  store.dispatch(openM1);
  store.dispatch(createNew("f1"));
  const save = parts.sentRequests.find(({ kind }) => kind === "saveFlashcard");
  if (!save) throw new Error("No save was sent.");
  parts.respond(save, {
    ok: false,
    error: { status: 500, message: "The server failed." },
  });
  await Promise.resolve();
  return store;
}

describe("watchBackupFaults", () => {
  it("shows a notice once a save fails", async () => {
    const store = await storeAfterFailedSave();
    expect(
      selectNotices(store.getState()).map(({ message }) => message),
    ).toContain("Some flashcards haven't been saved to your server yet.");
  });
});
