import {
  useAddLibraryItemMutation,
  useDeleteLibraryItemMutation,
  useProposeLibraryWordsMutation,
  usePublishLibraryItemMutation,
  usePutLibrarySubtitlesMutation,
  useUnpublishLibraryItemMutation,
  useUpdateLibraryItemMutation,
  useUploadLibraryFileMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { LibraryItemDraft } from "@easyimmerse/types";
import { useState } from "react";
import { useBrowserFileRegistry } from "../../browserFileRegistryContext.ts";
import { libraryFailureMessage } from "../../lib/library/libraryFailureMessage.ts";
import type { LibrarySubtitleFiles } from "../../lib/library/libraryUploads.ts";
import {
  librarySubtitlesOf,
  unreachableFile,
  uploadFromRegistry,
} from "../../lib/library/libraryUploads.ts";
import { useAppDispatch } from "../../useAppDispatch.ts";
import type { LibraryEditActivity } from "./LibraryEditView.tsx";

/**
 * The changes the library edit screen makes to an item through the server, with what is under way and why the last one failed.
 * Each change resolves to whether it was made. `onDeleted` is called once the item is deleted.
 */
export function useLibraryItemEditing(itemId: string, onDeleted: () => void) {
  const dispatch = useAppDispatch();
  const registry = useBrowserFileRegistry();
  const [update, updated] = useUpdateLibraryItemMutation();
  const [upload, uploaded] = useUploadLibraryFileMutation();
  const [putSubtitles, subtitlesPut] = usePutLibrarySubtitlesMutation();
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
        setFailure(libraryFailureMessage(error, fallback));
        return false;
      },
    );
  };
  const activity: LibraryEditActivity = {
    isSaving: updated.isLoading,
    isUploading: uploaded.isLoading || subtitlesPut.isLoading,
    isPublishing:
      proposed.isLoading || published.isLoading || unpublished.isLoading,
    isOpening: added.isLoading,
    failure,
  };
  return {
    activity,
    save: (draft: LibraryItemDraft) =>
      run("Could not save the details.", () =>
        update({ itemId, draft }).unwrap(),
      ),
    replaceFile: (file: File) =>
      run("Could not upload the file.", () =>
        registry === null
          ? Promise.reject(unreachableFile)
          : uploadFromRegistry(registry, file, (picked) =>
              upload({ itemId, file: picked }).unwrap(),
            ),
      ),
    replaceSubtitles: (files: LibrarySubtitleFiles) =>
      run("Could not upload the subtitles.", async () =>
        putSubtitles({
          itemId,
          subtitles: await librarySubtitlesOf(files),
        }).unwrap(),
      ),
    /** Adds the item to the project given, or to a new one when null, and opens it there in the player or the reader. */
    openWords: (projectId: string | null) =>
      run("Could not open the item.", async () => {
        const opened = await add({ itemId, projectId }).unwrap();
        dispatch(
          actions.openMediaFileRequested(
            opened.project_id,
            opened.media_file_id,
          ),
        );
      }),
    proposeWords: () =>
      run("Could not propose words.", () => propose(itemId).unwrap()),
    publish: () =>
      run("Could not publish the item.", () => publish(itemId).unwrap()),
    unpublish: () =>
      run("Could not unpublish the item.", () => unpublish(itemId).unwrap()),
    remove: () =>
      run("Could not delete the item.", () =>
        remove(itemId).unwrap().then(onDeleted),
      ),
  };
}
