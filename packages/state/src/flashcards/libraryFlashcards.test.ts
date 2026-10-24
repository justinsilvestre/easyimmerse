import type { Flashcard } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { createAppStore } from "../app/createAppStore.ts";
import { createFakeServerStoreParts } from "../app/createFakeServerStoreParts.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import type { ServerRequest } from "../server/serverRequest.ts";
import { exampleListedFlashcard } from "./exampleFlashcards.ts";
import { flashcardScope } from "./flashcardRequests.ts";
import { libraryFlashcardCommands } from "./libraryFlashcards.ts";
import {
  hundPlace,
  libraryHund,
  withLibraryVideo,
} from "./libraryFlashcardTestSupport.ts";

const hund: Flashcard = {
  ...exampleListedFlashcard("f1", "Hund"),
  media_file_id: "m1",
};

const request: ServerRequest = {
  kind: "createLibraryFlashcard",
  projectId: "p1",
  mediaFileId: "m1",
  flashcard: { id: "f1", segment_index: 0, word_start: 4 },
};

const settled = (outcome: Parameters<typeof actions.requestSettled>[2]) =>
  actions.requestSettled("libraryFlashcard/f1", request, outcome as never);

/** A store on the media screen of the library media file m1, with the lookup cursor on "Hund". */
function storeOnLibraryVideo() {
  const server = createFakeServerStoreParts(null, withLibraryVideo);
  const store = createAppStore(createRecordingEffects(), server);
  store.dispatch(actions.openMediaFileRequested("p1", "m1"));
  store.dispatch(actions.lookupCursorMoved(libraryHund, "mouse"));
  return { server, store };
}

describe("libraryFlashcardCommands", () => {
  it("asks for a fresh id for a library flashcard asked for", () => {
    expect(
      libraryFlashcardCommands(actions.libraryFlashcardRequested(hundPlace)),
    ).toEqual([{ type: "createLibraryFlashcard", place: hundPlace }]);
  });

  it("sends a started library flashcard in its flashcard's scope", () => {
    const [effect] = libraryFlashcardCommands(
      actions.libraryFlashcardStarted(hundPlace, "f1"),
    );
    expect(effect).toMatchObject({
      type: "sendRequest",
      request,
      scope: flashcardScope("f1"),
    });
  });

  it("shows the saved notice, whose Undo deletes the new flashcard, once the flashcard lands", () => {
    const [effect] = libraryFlashcardCommands(
      settled({ ok: true, data: hund }),
    );
    expect(effect).toMatchObject({
      action: {
        content: {
          message: "Saved the flashcard for “Hund”.",
          buttons: [
            {
              label: "Undo",
              action: actions.saveUndoRequested({
                projectId: "p1",
                flashcardId: "f1",
                word: "Hund",
                before: null,
              }),
            },
          ],
        },
      },
    });
  });

  it("tells that the flashcard could not be saved when its request fails", () => {
    const [effect] = libraryFlashcardCommands(
      settled({ ok: false, error: { status: 400, message: "No such word." } }),
    );
    expect(effect).toMatchObject({
      action: {
        content: { message: "Couldn't save the flashcard. Try again." },
      },
    });
  });
});

describe("a library flashcard asked for with the E key", () => {
  it("is saved at once under a fresh id", () => {
    const { server, store } = storeOnLibraryVideo();
    store.dispatch(actions.lookupCursorFlashcardRequested("editor"));
    expect(server.sentRequests.at(-1)).toMatchObject({
      kind: "createLibraryFlashcard",
      flashcard: { id: expect.stringMatching(/^[0-9a-f]{32}$/), word_start: 4 },
    });
  });
});
