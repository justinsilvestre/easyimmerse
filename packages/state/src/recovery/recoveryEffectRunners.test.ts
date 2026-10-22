import { describe, expect, it, vi } from "vitest";
import { actions } from "../app/appAction.ts";
import { createAppStore } from "../app/createAppStore.ts";
import { createFakeServerStoreParts } from "../app/createFakeServerStoreParts.ts";
import { selectFailedSaves } from "../flashcards/failedSave.ts";
import {
  appAfter,
  applied,
  failure,
  hund,
  settle,
  startNew,
  typeWord,
} from "../flashcards/flashcardsTestSupport.ts";
import { selectNotices } from "../notices/noticesSelectors.ts";
import {
  createRecordingEffects,
  type RecordingEffects,
} from "../platform/recordingEffects.ts";
import {
  parseRecoverableWork,
  recoverableWorkKey,
  selectRecoverableWork,
} from "./recoverableWork.ts";

const openHund = actions.flashcardOpened("h", hund);

/** The work a crash would have left: hund changed to "Hündin", its background save failed. */
function failedSaveLeft() {
  const app = appAfter(openHund, typeWord("Hündin"), startNew("f2"));
  const failed = applied(app, settle(app, "flashcard/h/1", failure("NETWORK")));
  return selectRecoverableWork(failed);
}

/** The work a crash would have left: hund's deletion under way. */
const deletionLeft = () =>
  selectRecoverableWork(appAfter(openHund, actions.flashcardDeleteRequested()));

/** Starts the app over effects that hold the given text on the device. */
function startWithStored(stored: string | null) {
  const effects = createRecordingEffects();
  if (stored !== null) effects.deviceValues.set(recoverableWorkKey, stored);
  return startOver(effects);
}

function startOver(effects: RecordingEffects) {
  const server = createFakeServerStoreParts();
  const store = createAppStore(effects, server);
  return { effects, server, store };
}

const isLoaded = (store: ReturnType<typeof startOver>["store"]) =>
  store.getState().app.recovery.isLoaded;

function savedFlashcardIdsOf(work: ReturnType<typeof parseRecoverableWork>) {
  if (work === "unreadable") return [];
  return work.saves.flatMap(({ request }) =>
    request.kind === "saveFlashcard" ? [request.flashcardId] : [],
  );
}

async function startLoaded(effects = createRecordingEffects()) {
  const started = startOver(effects);
  await vi.waitFor(() => expect(isLoaded(started.store)).toBe(true));
  return started;
}

async function startAndEditCard(effects: RecordingEffects) {
  const { store } = await startLoaded(effects);
  store.dispatch(actions.openMediaFileRequested("p1", "m1"));
  store.dispatch(openHund);
  store.dispatch(typeWord("Hündin"));
  return store;
}

describe("recoveryEffectRunners", () => {
  describe("for loadRecoverableWork", () => {
    it("lists a stored failed save among the failed saves", async () => {
      const { store } = startWithStored(JSON.stringify(failedSaveLeft()));
      await vi.waitFor(() =>
        expect(
          selectFailedSaves(store.getState().app).map(
            ({ card }) => card.editor.content.word,
          ),
        ).toEqual(["Hündin"]),
      );
    });

    it("sends a stored deletion again", async () => {
      const { server } = startWithStored(JSON.stringify(deletionLeft()));
      await vi.waitFor(() =>
        expect(server.sentRequests.map(({ kind }) => kind)).toEqual([
          "deleteFlashcard",
        ]),
      );
    });

    it("marks the recovery loaded when nothing is stored", async () => {
      const { store } = startWithStored(null);
      await vi.waitFor(() => expect(isLoaded(store)).toBe(true));
    });

    it("lists no failed saves when nothing is stored", async () => {
      const { store } = await startLoaded();
      expect(selectFailedSaves(store.getState().app)).toEqual([]);
    });

    it("tells the user when the stored text is unreadable", async () => {
      const { store } = startWithStored("{");
      await vi.waitFor(() =>
        expect(
          selectNotices(store.getState()).map(({ message }) => message),
        ).toEqual([
          "Couldn't recover the flashcard changes that were not saved when the app last closed.",
        ]),
      );
    });

    it("counts a failed load as nothing kept", async () => {
      const effects = createRecordingEffects();
      effects.loadFromDevice = () => Promise.reject(new Error("No storage."));
      const { store } = startOver(effects);
      await vi.waitFor(() => expect(isLoaded(store)).toBe(true));
    });

    it("shows no notice for a failed load", async () => {
      const effects = createRecordingEffects();
      effects.loadFromDevice = () => Promise.reject(new Error("No storage."));
      const { store } = await startLoaded(effects);
      expect(selectNotices(store.getState())).toEqual([]);
    });
  });

  describe("for saveRecoverableWork", () => {
    it("keeps the open card's changes on the device", async () => {
      const effects = createRecordingEffects();
      await startAndEditCard(effects);
      const work = parseRecoverableWork(
        effects.deviceValues.get(recoverableWorkKey) ?? null,
      );
      expect(savedFlashcardIdsOf(work)).toEqual(["h"]);
    });

    it("ignores a save that the device rejects", async () => {
      const effects = createRecordingEffects();
      effects.saveOnDevice = () => Promise.reject(new Error("Disk full."));
      const store = await startAndEditCard(effects);
      expect(store.getState().app.recovery.isLoaded).toBe(true);
    });
  });
});
