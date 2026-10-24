import { describe, expect, it } from "vitest";
import { type AppAction, actions } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import { transientNotice } from "../../notices/transientNotice.ts";
import type { PickedMediaFile } from "../../platform/effects.ts";
import type {
  RequestFailure,
  ServerRequest,
} from "../../server/serverRequest.ts";
import { exampleLibraryItem } from "../libraryBrowse/exampleLibraryItem.ts";
import {
  type LibraryCreation,
  updateLibraryCreation,
} from "./libraryCreation.ts";

const settings = { language: "de", translationLanguage: "en", projectId: "p1" };

const video: PickedMediaFile = {
  name: "park.mp4",
  source: { kind: "path", path: "/videos/park.mp4" },
};

const createRequest = {
  kind: "createLibraryItem",
  draft: {
    title: "park.mp4",
    description: "",
    language: "de",
    translation_language: "en",
    kind: "video",
    difficulty: null,
    tags: [],
  },
} satisfies ServerRequest;

const uploadRequest = {
  kind: "uploadLibraryFile",
  itemId: "i1",
  file: video,
} satisfies ServerRequest;

const addRequest = {
  kind: "addLibraryItem",
  itemId: "i1",
  projectId: "p1",
} satisfies ServerRequest;

const serverError: RequestFailure = { status: 500, message: "" };

const created = actions.requestSettled(
  "libraryCreation/create",
  createRequest,
  { ok: true, data: exampleLibraryItem({ status: { kind: "draft" } }) },
);

const uploaded = actions.requestSettled(
  "libraryCreation/upload",
  uploadRequest,
  { ok: true, data: exampleLibraryItem({ status: { kind: "draft" } }) },
);

const added = actions.requestSettled("libraryCreation/add", addRequest, {
  ok: true,
  data: { project_id: "p1", media_file_id: "m1" },
});

/** The creation and the effects after each action in turn, from none under way. */
function creationAfter(...done: AppAction[]) {
  let creation: LibraryCreation | null = null;
  let effects: readonly Effect[] = [];
  for (const action of done)
    [creation, effects] = updateLibraryCreation(creation, action);
  return { creation, effects };
}

const picking = [actions.libraryMediaPickRequested(settings)];
const creating = [...picking, actions.mediaFileChosen(video)];

describe("updateLibraryCreation", () => {
  it("opens the media file picker when asked", () => {
    expect(creationAfter(...picking).effects[0]).toEqual({
      type: "pickMediaFile",
      accept: expect.arrayContaining([".mp4", ".epub"]),
    });
  });

  it("gives up when the pick is cancelled", () => {
    expect(
      creationAfter(...picking, actions.mediaFilePickCancelled()).creation,
    ).toBeNull();
  });

  it("creates an item named after the picked file", () => {
    expect(creationAfter(...creating).effects).toContainEqual({
      type: "sendRequest",
      id: "libraryCreation/create",
      request: createRequest,
    });
  });

  it("makes a document item of a text file", () => {
    const text = { ...video, name: "story.epub" };
    const [, effects] = updateLibraryCreation(
      { stage: "picking", settings },
      actions.mediaFileChosen(text),
    );
    expect(effects).toContainEqual(
      expect.objectContaining({
        request: expect.objectContaining({
          draft: expect.objectContaining({ kind: "document" }),
        }),
      }),
    );
  });

  it("ignores a media file picked for a project", () => {
    expect(creationAfter(actions.mediaFileChosen(video)).effects).toEqual([]);
  });

  it("uploads the file once the item is created", () => {
    expect(creationAfter(...creating, created).effects).toContainEqual({
      type: "sendRequest",
      id: "libraryCreation/upload",
      request: uploadRequest,
    });
  });

  it("adds the item to the library project once its file is uploaded", () => {
    expect(
      creationAfter(...creating, created, uploaded).effects,
    ).toContainEqual({
      type: "sendRequest",
      id: "libraryCreation/add",
      request: addRequest,
    });
  });

  it("opens the item in the library project once it is added", () => {
    expect(
      creationAfter(...creating, created, uploaded, added).effects,
    ).toEqual([
      {
        type: "dispatch",
        action: actions.openMediaFileRequested("p1", "m1"),
      },
    ]);
  });

  it("names the file when the item can't be created", () => {
    const failed = actions.requestSettled(
      "libraryCreation/create",
      createRequest,
      { ok: false, error: serverError },
    );
    expect(creationAfter(...creating, failed).effects).toEqual([
      {
        type: "dispatch",
        action: actions.noticeRequested(
          transientNotice(
            "danger",
            "“park.mp4” couldn't be added to the library. Try again in a moment.",
          ),
        ),
      },
    ]);
  });

  it("ends when the file can't be uploaded", () => {
    const failed = actions.requestSettled(
      "libraryCreation/upload",
      uploadRequest,
      { ok: false, error: serverError },
    );
    expect(creationAfter(...creating, created, failed).creation).toBeNull();
  });
});
