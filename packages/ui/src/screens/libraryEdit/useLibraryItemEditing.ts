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
  useUploadLibraryFileMutation,
} from "@easyimmerse/backend";
import { actions, libraryFailureMessage } from "@easyimmerse/state";
import type { LibraryItemDraft } from "@easyimmerse/types";
import { useState } from "react";
import { useBrowserFileRegistry } from "../../browserFileRegistryContext.ts";
import {
  unreachableFile,
  uploadFromRegistry,
} from "../../lib/library/libraryUploads.ts";
import { useAppDispatch } from "../../useAppDispatch.ts";
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
  const [upload, uploaded] = useUploadLibraryFileMutation();
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
  const run = (fallback: string, change: () => Promise<unknown>) => {
    setFailure(null);
    return change().then(
      () => true,
      (error) => {
        setFailure(libraryFailureMessage(error, fallback, title));
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
    isUploading: uploaded.isLoading,
    isPublishing:
      proposed.isLoading || published.isLoading || unpublished.isLoading,
    isOpening: added.isLoading,
    failure,
  };
  return {
    activity,
    save: (draft: LibraryItemDraft) =>
      run(
        `The details of ${title} couldn't be saved. Try again in a moment.`,
        () => update({ itemId, draft }).unwrap(),
      ),
    replaceFile: (file: File) =>
      run(
        `The file of ${title} couldn't be uploaded. Try again in a moment.`,
        () =>
          registry === null
            ? Promise.reject(unreachableFile)
            : uploadFromRegistry(registry, file, (picked) =>
                upload({ itemId, file: picked }).unwrap(),
              ),
      ),
    uploadCover: (file: File) =>
      run(
        `The cover picture of ${title} couldn't be uploaded. Try again in a moment.`,
        () =>
          registry === null
            ? Promise.reject(unreachableFile)
            : uploadFromRegistry(registry, file, (picked) =>
                uploadCover({ itemId, file: picked }).unwrap(),
              ),
      ),
    chooseCoverFrame: (atMs: number) =>
      run(
        `The cover of ${title} couldn't be taken from that frame. Try again in a moment.`,
        () => chooseCoverFrame({ itemId, atMs }).unwrap(),
      ),
    resetCover: () =>
      run(
        `The cover of ${title} couldn't be changed. Try again in a moment.`,
        () => resetCover(itemId).unwrap(),
      ),
    /** Adds the item to the project given, or to a new one when null, and opens it there in the player or the reader. */
    openWords: (projectId: string | null) =>
      run(
        `${title} couldn't be opened in the player or the reader. Try again in a moment.`,
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
        `The words of ${title} couldn't be filled in from your dictionaries. Try again in a moment.`,
        () => propose(itemId).unwrap(),
      ),
    publish: () =>
      run(`${title} couldn't be published. Try again in a moment.`, () =>
        publish(itemId).unwrap(),
      ),
    unpublish: () =>
      run(`${title} couldn't be unpublished. Try again in a moment.`, () =>
        unpublish(itemId).unwrap(),
      ),
    remove: () =>
      run(`${title} couldn't be deleted. Try again in a moment.`, () =>
        remove(itemId).unwrap().then(onDeleted),
      ),
  };
}
