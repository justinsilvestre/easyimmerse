import type { LibraryItemDraft, LibraryItemKind } from "@easyimmerse/types";
import { type AppAction, actions } from "../../app/appAction.ts";
import type { AppRoot } from "../../app/createAppStore.ts";
import { dispatch } from "../../app/dispatchEffect.ts";
import type { Effect } from "../../app/effect.ts";
import { updated } from "../../app/updated.ts";
import { transientNotice } from "../../notices/transientNotice.ts";
import type { PickedMediaFile } from "../../platform/effects.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { RequestFailure } from "../../server/serverRequest.ts";
import { libraryFailureMessage } from "../libraryEdit/libraryFailureMessage.ts";
import {
  isAudioFileName,
  isDocumentFileName,
  mediaFileExtensions,
} from "../mediaFileExtensions.ts";

/** What a new library item is made with, besides its file: its languages, and the project where it opens to be prepared. */
export type NewLibraryItemSettings = {
  language: string;
  translationLanguage: string;
  /** The library manager's library project for the language, or null to have one made. */
  projectId: string | null;
};

/**
 * A new library item on its way: its file being picked, then the item being created, its file uploaded,
 * and the item added to the project where it opens in the player or the reader.
 */
export type LibraryCreation =
  | { stage: "picking"; settings: NewLibraryItemSettings }
  | {
      stage: "creating";
      settings: NewLibraryItemSettings;
      file: PickedMediaFile;
    }
  | {
      stage: "uploading";
      settings: NewLibraryItemSettings;
      file: PickedMediaFile;
      itemId: string;
    }
  | { stage: "opening"; file: PickedMediaFile };

const requestIds = {
  create: "libraryCreation/create",
  upload: "libraryCreation/upload",
  add: "libraryCreation/add",
};

/**
 * Makes a library item of a media file or a text the library manager picks: creates the item, named after the file, uploads the file,
 * then adds the item to the library project and opens it there, where the manager prepares it for learners.
 * A failure at any step ends the creation with a notice naming the file.
 */
export function updateLibraryCreation(
  creation: LibraryCreation | null,
  action: AppAction,
) {
  if (action.type === "libraryMediaPickRequested")
    return updated({ stage: "picking", settings: action.settings }, {
      type: "pickMediaFile",
      accept: mediaFileExtensions,
    } satisfies Effect);
  if (creation === null) return updated(creation);
  if (action.type === "mediaFilePickCancelled" && creation.stage === "picking")
    return updated(null);
  if (action.type === "mediaFileChosen" && creation.stage === "picking")
    return create(creation.settings, action.file);
  if (action.type === "requestSettled" && creation.stage !== "picking")
    return settle(creation, action);
  return updated(creation);
}

function create(settings: NewLibraryItemSettings, file: PickedMediaFile) {
  return updated(
    { stage: "creating", settings, file } satisfies LibraryCreation,
    {
      type: "sendRequest",
      id: requestIds.create,
      request: { kind: "createLibraryItem", draft: draftOf(settings, file) },
    } satisfies Effect,
  );
}

function settle(
  creation: Exclude<LibraryCreation, { stage: "picking" }>,
  action: Extract<AppAction, { type: "requestSettled" }>,
) {
  const title = `“${creation.file.name}”`;
  if (
    creation.stage === "creating" &&
    isSettled(action, requestIds.create, "createLibraryItem")
  ) {
    if (!action.outcome.ok)
      return failed(
        action.outcome.error,
        `${title} couldn't be added to the library.`,
      );
    const itemId = action.outcome.data.id;
    return updated(
      { ...creation, stage: "uploading", itemId } satisfies LibraryCreation,
      {
        type: "sendRequest",
        id: requestIds.upload,
        request: { kind: "uploadLibraryFile", itemId, file: creation.file },
      } satisfies Effect,
    );
  }
  if (
    creation.stage === "uploading" &&
    isSettled(action, requestIds.upload, "uploadLibraryFile")
  ) {
    if (!action.outcome.ok)
      return failed(
        action.outcome.error,
        `${title} was added to the library as a draft, but the file couldn't be uploaded.`,
        "Open the draft below to upload the file again.",
      );
    const { itemId, settings, file } = creation;
    return updated(
      { stage: "opening", file } satisfies LibraryCreation,
      {
        type: "sendRequest",
        id: requestIds.add,
        request: {
          kind: "addLibraryItem",
          itemId,
          projectId: settings.projectId,
        },
      } satisfies Effect,
    );
  }
  if (
    creation.stage === "opening" &&
    isSettled(action, requestIds.add, "addLibraryItem")
  ) {
    if (!action.outcome.ok)
      return failed(
        action.outcome.error,
        `${title} was added to the library, but couldn't be opened in the player or the reader.`,
        "Open it below to try again.",
      );
    const { project_id, media_file_id } = action.outcome.data;
    return updated(
      null,
      dispatch(actions.openMediaFileRequested(project_id, media_file_id)),
    );
  }
  return updated(creation);
}

function failed(error: RequestFailure, didntHappen: string, nextStep?: string) {
  return updated(
    null,
    dispatch(
      actions.noticeRequested(
        transientNotice(
          "danger",
          libraryFailureMessage(error, didntHappen, nextStep),
        ),
      ),
    ),
  );
}

/** The draft of a new item: named after its file, in the chosen languages, of the kind its file's name tells. */
function draftOf(
  settings: NewLibraryItemSettings,
  file: PickedMediaFile,
): LibraryItemDraft {
  return {
    title: file.name,
    description: "",
    language: settings.language,
    translation_language: settings.translationLanguage,
    kind: kindOf(file.name),
    difficulty: null,
    tags: [],
  };
}

function kindOf(name: string): LibraryItemKind {
  if (isDocumentFileName(name)) return "document";
  return isAudioFileName(name) ? "audio" : "video";
}

/** Tells whether a new library item is being created, uploaded or opened, which the file picker's own dialog does not count toward. */
export function selectIsCreatingLibraryItem(root: AppRoot): boolean {
  const main = root.app.screen.main;
  return (
    main.kind === "libraryManage" &&
    main.creation !== null &&
    main.creation.stage !== "picking"
  );
}
