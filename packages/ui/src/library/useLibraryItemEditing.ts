import {
  useApplyLibraryEntryMutation,
  useDeleteLibraryItemMutation,
  useProposeLibraryWordsMutation,
  usePublishLibraryItemMutation,
  usePutLibrarySubtitlesMutation,
  usePutLibraryWordsMutation,
  useUnpublishLibraryItemMutation,
  useUpdateLibraryItemMutation,
  useUploadLibraryFileMutation,
} from "@easyimmerse/backend";
import type {
  LibraryEntry,
  LibraryItemDraft,
  LibraryWord,
} from "@easyimmerse/types";
import { useState } from "react";
import { useBrowserFileRegistry } from "../browserFileRegistryContext.ts";
import type { LibraryEditActivity } from "./LibraryEditView.tsx";
import type { LibrarySubtitleFiles } from "./LibraryFilesSection.tsx";
import { libraryFailureMessage } from "./libraryFailureMessage.ts";
import {
  librarySubtitlesOf,
  unreachableFile,
  uploadFromRegistry,
} from "./libraryUploads.ts";
import { createSaveQueue } from "./saveQueue.ts";

/**
 * The changes the library edit screen makes to an item through the server, with what is under way and why the last one failed.
 * Each change resolves to whether it was made. Saves of one segment's words go one after another.
 * `onDeleted` is called once the item is deleted.
 */
export function useLibraryItemEditing(itemId: string, onDeleted: () => void) {
  const registry = useBrowserFileRegistry();
  const [update, updated] = useUpdateLibraryItemMutation();
  const [upload, uploaded] = useUploadLibraryFileMutation();
  const [putSubtitles, subtitlesPut] = usePutLibrarySubtitlesMutation();
  const [putWords] = usePutLibraryWordsMutation();
  const [applyEntry] = useApplyLibraryEntryMutation();
  const [propose, proposed] = useProposeLibraryWordsMutation();
  const [publish, published] = usePublishLibraryItemMutation();
  const [unpublish, unpublished] = useUnpublishLibraryItemMutation();
  const [remove] = useDeleteLibraryItemMutation();
  const [failure, setFailure] = useState<string | null>(null);
  const [wordSaves] = useState(createSaveQueue);
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
    saveWords: (segmentIndex: number, words: LibraryWord[]) =>
      run("Could not save the words.", () =>
        wordSaves.run(segmentIndex, () =>
          putWords({ itemId, segmentIndex, words }).unwrap(),
        ),
      ),
    applyEverywhere: (text: string, entry: LibraryEntry) =>
      run("Could not save the entry.", () =>
        applyEntry({ itemId, apply: { word_text: text, entry } }).unwrap(),
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
