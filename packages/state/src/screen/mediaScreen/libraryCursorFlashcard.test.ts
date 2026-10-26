import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import type { LibraryFlashcardPlace } from "../../flashcards/libraryFlashcards.ts";
import {
  hundPlace,
  libraryHund,
  libraryVideo,
  withLibraryVideo,
  withLibraryVideoText,
} from "../../flashcards/libraryFlashcardTestSupport.ts";
import type { ServerCacheSlice } from "../../server/cacheEntry.ts";
import { serverCacheWith } from "../../server/serverCacheWith.ts";
import { exampleLibraryItem } from "../libraryBrowse/exampleLibraryItem.ts";
import { cursorFlashcardCommands } from "./cursorFlashcardCommands.ts";

const onHund = actions.lookupCursorMoved(libraryHund, "mouse");

/** The commands of the action on the media screen of the library media file m1, two seconds in, after the earlier actions. */
const apply = (
  action: AppAction,
  backend: ServerCacheSlice = withLibraryVideo,
  ...before: AppAction[]
) =>
  cursorFlashcardCommands(action, {
    ...stateAfter(
      actions.openMediaFileRequested("p1", "m1"),
      actions.playerTimeChanged(2),
      ...before,
    ),
    backend,
  });

const requested = (place: LibraryFlashcardPlace) => [
  { type: "dispatch", action: actions.libraryFlashcardRequested(place) },
];

describe("cursorFlashcardCommands on a library media file", () => {
  it("asks for a library flashcard for the cursor's word on the C key", () => {
    const save = actions.lookupCursorFlashcardRequested("save");
    expect(apply(save, withLibraryVideo, onHund)).toEqual(requested(hundPlace));
  });

  it("asks for the same library flashcard on the E key, since it cannot be edited", () => {
    const editor = actions.lookupCursorFlashcardRequested("editor");
    expect(apply(editor, withLibraryVideo, onHund)).toEqual(
      requested(hundPlace),
    );
  });

  it("asks for a library flashcard for the whole cue shown now when there is no cursor", () => {
    const save = actions.lookupCursorFlashcardRequested("save");
    expect(apply(save)).toEqual(requested({ ...hundPlace, wordStart: null }));
  });

  it("asks for nothing while the item's text is not cached", () => {
    const save = actions.lookupCursorFlashcardRequested("save");
    const filesOnly = serverCacheWith("listMediaFiles", "p1", {
      media_files: [libraryVideo],
    });
    expect(apply(save, filesOnly, onHund)).toEqual([]);
  });

  it("asks for nothing while the item is not published, as when a library manager prepares it", () => {
    const save = actions.lookupCursorFlashcardRequested("save");
    const draft = serverCacheWith(
      "getLibraryItem",
      "i1",
      exampleLibraryItem({ status: { kind: "draft" } }),
      withLibraryVideoText,
    );
    expect(apply(save, draft, onHund)).toEqual([]);
  });
});
