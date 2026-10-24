import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import { updated } from "../../app/updated.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { RequestFailure } from "../../server/serverRequest.ts";
import {
  documentFileExtensions,
  videoAndAudioFileExtensions,
} from "../mediaFileExtensions.ts";

/** A library item's file on its way to being replaced: being picked, then uploaded, or the failure that ended the upload. */
export type LibraryFileReplacement = { itemId: string } & (
  | { stage: "picking" }
  | { stage: "uploading" }
  | { stage: "failed"; error: RequestFailure }
);

const uploadId = (itemId: string) => `libraryEdit/replaceFile/${itemId}`;

/**
 * Replaces the file of a library item with one the library manager picks on this device.
 * Moving to another place ends a pick or a failure, but not an upload under way, so that its outcome is still kept.
 */
export function updateLibraryFileReplacement(
  replacement: LibraryFileReplacement | null,
  action: AppAction,
) {
  if (action.type === "libraryFileReplacePickRequested")
    return updated(
      {
        itemId: action.itemId,
        stage: "picking",
      } satisfies LibraryFileReplacement,
      {
        type: "pickMediaFile",
        accept:
          action.kind === "document"
            ? documentFileExtensions
            : videoAndAudioFileExtensions,
      } satisfies Effect,
    );
  if (replacement === null) return updated(replacement);
  if (replacement.stage === "picking")
    return updatePicking(replacement, action);
  if (replacement.stage === "uploading")
    return updateUploading(replacement, action);
  return updated(action.type === "navigated" ? null : replacement);
}

function updatePicking(
  replacement: LibraryFileReplacement & { stage: "picking" },
  action: AppAction,
) {
  const { itemId } = replacement;
  switch (action.type) {
    case "mediaFilePickCancelled":
    case "navigated":
      return updated(null);
    case "mediaFileChosen":
      return updated(
        { itemId, stage: "uploading" } satisfies LibraryFileReplacement,
        {
          type: "sendRequest",
          id: uploadId(itemId),
          request: { kind: "uploadLibraryFile", itemId, file: action.file },
        } satisfies Effect,
      );
    default:
      return updated(replacement);
  }
}

function updateUploading(
  replacement: LibraryFileReplacement & { stage: "uploading" },
  action: AppAction,
) {
  const { itemId } = replacement;
  if (!isSettled(action, uploadId(itemId), "uploadLibraryFile"))
    return updated(replacement);
  return updated(
    action.outcome.ok
      ? null
      : ({
          itemId,
          stage: "failed",
          error: action.outcome.error,
        } satisfies LibraryFileReplacement),
  );
}
