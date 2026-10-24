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
import { useBrowserFileRegistry } from "../../browserFileRegistryContext.ts";
import { libraryFailureMessage } from "../../lib/library/libraryFailureMessage.ts";
import type { LibrarySubtitleFiles } from "../../lib/library/libraryUploads.ts";
import {
  librarySubtitlesOf,
  unreachableFile,
  uploadFromRegistry,
} from "../../lib/library/libraryUploads.ts";
import type { LibraryEditActivity } from "./LibraryEditView.tsx";
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
      run("The details couldn't be saved. Try again in a moment.", () =>
        update({ itemId, draft }).unwrap(),
      ),
    replaceFile: (file: File) =>
      run("The file couldn't be uploaded. Try again in a moment.", () =>
        registry === null
          ? Promise.reject(unreachableFile)
          : uploadFromRegistry(registry, file, (picked) =>
              upload({ itemId, file: picked }).unwrap(),
            ),
      ),
    replaceSubtitles: (files: LibrarySubtitleFiles) =>
      run(
        "The subtitles couldn't be uploaded. Try again in a moment.",
        async () =>
          putSubtitles({
            itemId,
            subtitles: await librarySubtitlesOf(files),
          }).unwrap(),
      ),
    saveWords: (segmentIndex: number, words: LibraryWord[]) =>
      run(
        "The words of this subtitle couldn't be saved. Try again in a moment.",
        () =>
          wordSaves.run(segmentIndex, () =>
            putWords({ itemId, segmentIndex, words }).unwrap(),
          ),
      ),
    applyEverywhere: (text: string, entry: LibraryEntry) =>
      run(
        "The dictionary entry couldn't be saved. Try again in a moment.",
        () =>
          applyEntry({ itemId, apply: { word_text: text, entry } }).unwrap(),
      ),
    proposeWords: () =>
      run(
        "The words couldn't be filled in from your dictionaries. Try again in a moment.",
        () => propose(itemId).unwrap(),
      ),
    publish: () =>
      run("The item couldn't be published. Try again in a moment.", () =>
        publish(itemId).unwrap(),
      ),
    unpublish: () =>
      run("The item couldn't be unpublished. Try again in a moment.", () =>
        unpublish(itemId).unwrap(),
      ),
    remove: () =>
      run("The item couldn't be deleted. Try again in a moment.", () =>
        remove(itemId).unwrap().then(onDeleted),
      ),
  };
}
