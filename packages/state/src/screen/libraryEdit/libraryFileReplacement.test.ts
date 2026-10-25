import { describe, expect, it } from "vitest";
import { type AppAction, actions } from "../../app/appAction.ts";
import type { PickedMediaFile } from "../../platform/effects.ts";
import type { RequestFailure } from "../../server/serverRequest.ts";
import { exampleLibraryItem } from "../libraryBrowse/exampleLibraryItem.ts";
import { videoAndAudioFileExtensions } from "../mediaFileExtensions.ts";
import {
  type LibraryFileReplacement,
  updateLibraryFileReplacement,
} from "./libraryFileReplacement.ts";

const park: PickedMediaFile = {
  name: "park.mp4",
  source: { kind: "path", path: "/videos/park.mp4" },
};

const uploadRequest = {
  kind: "uploadLibraryFile",
  itemId: "i1",
  file: park,
} as const;

const serverError: RequestFailure = { status: 500, message: "" };

const picking = { itemId: "i1", stage: "picking" } as const;
const uploading = { itemId: "i1", stage: "uploading" } as const;

const settled = (outcome: Parameters<typeof actions.requestSettled>[2]) =>
  actions.requestSettled("libraryEdit/replaceFile/i1", uploadRequest, outcome);

function replacementAfter(
  replacement: LibraryFileReplacement | null,
  action: AppAction,
) {
  const [next, effects] = updateLibraryFileReplacement(replacement, action);
  return { replacement: next, effects };
}

describe("updateLibraryFileReplacement", () => {
  describe("when a replacement is asked for", () => {
    const asked = replacementAfter(
      null,
      actions.libraryFileReplacePickRequested("i1", "video"),
    );

    it("waits for the file to be picked", () => {
      expect(asked.replacement).toEqual(picking);
    });

    it("opens the picker for video and audio files when the item is a video", () => {
      expect(asked.effects).toEqual([
        { type: "pickMediaFile", accept: videoAndAudioFileExtensions },
      ]);
    });

    it("opens the picker for video and audio files when the item is audio", () => {
      expect(
        replacementAfter(
          null,
          actions.libraryFileReplacePickRequested("i1", "audio"),
        ).effects,
      ).toEqual([
        { type: "pickMediaFile", accept: videoAndAudioFileExtensions },
      ]);
    });

    it("opens the picker for ebooks and text files only when the item is a document", () => {
      expect(
        replacementAfter(
          null,
          actions.libraryFileReplacePickRequested("i1", "document"),
        ).effects,
      ).toEqual([{ type: "pickMediaFile", accept: [".epub", ".txt"] }]);
    });
  });

  it("forgets a failed replacement when another is asked for", () => {
    const failed = {
      ...uploading,
      stage: "failed",
      error: serverError,
    } as const;
    expect(
      replacementAfter(
        failed,
        actions.libraryFileReplacePickRequested("i1", "video"),
      ).replacement,
    ).toEqual(picking);
  });

  describe("when a file is picked", () => {
    const chosen = replacementAfter(picking, actions.mediaFileChosen(park));

    it("uploads it to the item", () => {
      expect(chosen.effects).toEqual([
        {
          type: "sendRequest",
          id: "libraryEdit/replaceFile/i1",
          request: uploadRequest,
        },
      ]);
    });

    it("waits for the upload", () => {
      expect(chosen.replacement).toEqual(uploading);
    });
  });

  it("ends when the pick is cancelled", () => {
    expect(
      replacementAfter(picking, actions.mediaFilePickCancelled()).replacement,
    ).toBeNull();
  });

  it("ignores a file picked while no replacement is asked for", () => {
    expect(
      replacementAfter(null, actions.mediaFileChosen(park)).effects,
    ).toEqual([]);
  });

  it("ends when the upload succeeds", () => {
    expect(
      replacementAfter(
        uploading,
        settled({ ok: true, data: exampleLibraryItem() }),
      ).replacement,
    ).toBeNull();
  });

  it("keeps why the upload failed", () => {
    expect(
      replacementAfter(uploading, settled({ ok: false, error: serverError }))
        .replacement,
    ).toEqual({ itemId: "i1", stage: "failed", error: serverError });
  });

  it("drops a pick when the app moves elsewhere", () => {
    expect(
      replacementAfter(picking, actions.navigated({ type: "manageLibrary" }))
        .replacement,
    ).toBeNull();
  });

  it("drops a failure when the app moves elsewhere", () => {
    const failed = {
      itemId: "i1",
      stage: "failed",
      error: serverError,
    } as const;
    expect(
      replacementAfter(failed, actions.navigated({ type: "manageLibrary" }))
        .replacement,
    ).toBeNull();
  });

  it("keeps an upload under way when the app moves elsewhere", () => {
    expect(
      replacementAfter(uploading, actions.navigated({ type: "manageLibrary" }))
        .replacement,
    ).toEqual(uploading);
  });
});
