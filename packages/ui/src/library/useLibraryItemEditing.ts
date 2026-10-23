import {
  useDeleteLibraryItemMutation,
  useProposeLibraryWordsMutation,
  usePublishLibraryItemMutation,
  usePutLibrarySubtitlesMutation,
  usePutLibraryWordsMutation,
  useUnpublishLibraryItemMutation,
  useUpdateLibraryItemMutation,
  useUploadLibraryFileMutation,
} from "@easyimmerse/backend";
import type { LibraryItemDraft } from "@easyimmerse/types";
import { useState } from "react";
import { useBrowserFileRegistry } from "../browserFileRegistryContext.ts";
import type { LibraryEditActivity } from "./LibraryEditView.tsx";
import type { LibrarySubtitleFiles } from "./LibraryFilesSection.tsx";
import { libraryFailureMessage } from "./libraryFailureMessage.ts";
import {
  librarySubtitlesOf,
  pickedFileOf,
  unreachableFile,
} from "./libraryUploads.ts";
import type { SegmentWords } from "./segmentWordEdits.ts";

/**
 * The changes the library edit screen makes to an item through the server, with what is under way and why the last one failed.
 * `onDeleted` is called once the item is deleted.
 */
export function useLibraryItemEditing(itemId: string, onDeleted: () => void) {
  const registry = useBrowserFileRegistry();
  const [update, updated] = useUpdateLibraryItemMutation();
  const [upload, uploaded] = useUploadLibraryFileMutation();
  const [putSubtitles, subtitlesPut] = usePutLibrarySubtitlesMutation();
  const [putWords] = usePutLibraryWordsMutation();
  const [propose, proposed] = useProposeLibraryWordsMutation();
  const [publish, published] = usePublishLibraryItemMutation();
  const [unpublish, unpublished] = useUnpublishLibraryItemMutation();
  const [remove] = useDeleteLibraryItemMutation();
  const [failure, setFailure] = useState<string | null>(null);
  const run = (fallback: string, change: () => Promise<unknown>) => {
    setFailure(null);
    change().catch((error) =>
      setFailure(libraryFailureMessage(error, fallback)),
    );
  };
  const activity: LibraryEditActivity = {
    isSaving: updated.isLoading,
    isUploading: uploaded.isLoading || subtitlesPut.isLoading,
    isPublishing:
      proposed.isLoading || published.isLoading || unpublished.isLoading,
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
          : upload({ itemId, file: pickedFileOf(registry, file) }).unwrap(),
      ),
    replaceSubtitles: (files: LibrarySubtitleFiles) =>
      run("Could not upload the subtitles.", async () =>
        putSubtitles({
          itemId,
          subtitles: await librarySubtitlesOf(files),
        }).unwrap(),
      ),
    saveWords: (changes: SegmentWords[]) =>
      run("Could not save the words.", () =>
        Promise.all(
          changes.map(({ segmentIndex, words }) =>
            putWords({ itemId, segmentIndex, words }).unwrap(),
          ),
        ),
      ),
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
