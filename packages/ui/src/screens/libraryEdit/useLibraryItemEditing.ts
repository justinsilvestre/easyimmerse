import {
  useAddLibraryItemMutation,
  useDeleteLibraryItemMutation,
  useProposeLibraryWordsMutation,
  usePublishLibraryItemMutation,
  useResetLibraryCoverMutation,
  useSetLibraryCoverFrameMutation,
  useUnpublishLibraryItemMutation,
  useUpdateLibraryItemMutation,
  useUploadLibraryCoverMutation,
} from "@easyimmerse/backend";
import {
  actions,
  type LibraryFileReplacement,
  libraryFailureMessage,
  selectLibraryFileReplacement,
} from "@easyimmerse/state";
import type { LibraryItemDraft, LibraryItemKind } from "@easyimmerse/types";
import { useState } from "react";
import { useBrowserFileRegistry } from "../../browserFileRegistryContext.ts";
import {
  unreachableFile,
  uploadFromRegistry,
} from "../../lib/library/libraryUploads.ts";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import type { LibraryEditActivity } from "./LibraryEditView.tsx";

/**
 * The changes the library edit screen makes to an item through the server, with what is under way and why the last one failed.
 * `title` names the item in the failures, quoted, as in "“Im Park”".
 * Each change resolves to whether it was made. `onDeleted` is called once the item is deleted.
 */
export function useLibraryItemEditing(
  itemId: string,
  title: string,
  onDeleted: () => void,
) {
  const dispatch = useAppDispatch();
  const registry = useBrowserFileRegistry();
  const [update, updated] = useUpdateLibraryItemMutation();
  const replacement = useAppSelector((state) =>
    selectLibraryFileReplacement(state, itemId),
  );
  const [uploadCover, coverUploaded] = useUploadLibraryCoverMutation();
  const [chooseCoverFrame, coverFrameChosen] =
    useSetLibraryCoverFrameMutation();
  const [resetCover, coverReset] = useResetLibraryCoverMutation();
  const [add, added] = useAddLibraryItemMutation();
  const [propose, proposed] = useProposeLibraryWordsMutation();
  const [publish, published] = usePublishLibraryItemMutation();
  const [unpublish, unpublished] = useUnpublishLibraryItemMutation();
  const [remove] = useDeleteLibraryItemMutation();
  const [failure, setFailure] = useState<string | null>(null);
  const run = (didntHappen: string, change: () => Promise<unknown>) => {
    setFailure(null);
    return change().then(
      () => true,
      (error) => {
        setFailure(libraryFailureMessage(error, didntHappen));
        return false;
      },
    );
  };
  const activity: LibraryEditActivity = {
    isSaving: updated.isLoading,
    isChangingCover:
      coverUploaded.isLoading ||
      coverFrameChosen.isLoading ||
      coverReset.isLoading,
    isUploading: replacement?.stage === "uploading",
    isPublishing:
      proposed.isLoading || published.isLoading || unpublished.isLoading,
    isOpening: added.isLoading,
    failure: failure ?? failureOfReplacement(replacement, title),
  };
  return {
    activity,
    save: (draft: LibraryItemDraft) =>
      run(`The details of ${title} couldn't be saved.`, () =>
        update({ itemId, draft }).unwrap(),
      ),
    /** Opens the file picker, then uploads the file picked in place of the item's file. */
    replaceFile: (kind: LibraryItemKind) =>
      dispatch(actions.libraryFileReplacePickRequested(itemId, kind)),
    uploadCover: (file: File) =>
      run(`The cover picture of ${title} couldn't be uploaded.`, () =>
        registry === null
          ? Promise.reject(unreachableFile)
          : uploadFromRegistry(registry, file, (picked) =>
              uploadCover({ itemId, file: picked }).unwrap(),
            ),
      ),
    chooseCoverFrame: (atMs: number) =>
      run(`The cover of ${title} couldn't be taken from that frame.`, () =>
        chooseCoverFrame({ itemId, atMs }).unwrap(),
      ),
    resetCover: () =>
      run(`The cover of ${title} couldn't be changed.`, () =>
        resetCover(itemId).unwrap(),
      ),
    /** Adds the item to the project given, or to a new one when null, and opens it there in the player or the reader. */
    openWords: (projectId: string | null) =>
      run(
        `${title} couldn't be opened in the player or the reader.`,
        async () => {
          const opened = await add({ itemId, projectId }).unwrap();
          dispatch(
            actions.openMediaFileRequested(
              opened.project_id,
              opened.media_file_id,
            ),
          );
        },
      ),
    proposeWords: () =>
      run(
        `The words of ${title} couldn't be filled in from your dictionaries.`,
        () => propose(itemId).unwrap(),
      ),
    publish: () =>
      run(`${title} couldn't be published.`, () => publish(itemId).unwrap()),
    unpublish: () =>
      run(`${title} couldn't be unpublished.`, () =>
        unpublish(itemId).unwrap(),
      ),
    remove: () =>
      run(`${title} couldn't be deleted.`, () =>
        remove(itemId).unwrap().then(onDeleted),
      ),
  };
}

function failureOfReplacement(
  replacement: LibraryFileReplacement | null,
  title: string,
) {
  if (replacement?.stage !== "failed") return null;
  return libraryFailureMessage(
    replacement.error,
    `The file of ${title} couldn't be replaced.`,
  );
}
