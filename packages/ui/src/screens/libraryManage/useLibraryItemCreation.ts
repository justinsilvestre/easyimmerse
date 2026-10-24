import {
  useCreateLibraryItemMutation,
  usePutLibrarySubtitlesMutation,
  useUploadLibraryFileMutation,
} from "@easyimmerse/backend";
import { useState } from "react";
import { useBrowserFileRegistry } from "../../browserFileRegistryContext.ts";
import { libraryFailureMessage } from "../../lib/library/libraryFailureMessage.ts";
import {
  librarySubtitlesOf,
  unreachableFile,
  uploadFromRegistry,
} from "../../lib/library/libraryUploads.ts";
import type { NewLibraryItem } from "./newLibraryItem.ts";

type Creation = { isCreating: boolean; failure: string | null };

/**
 * Adds an item to the library from the new-item form: creates its draft, uploads its file, then sends its subtitles,
 * and calls `onCreated` with its id once all three are done. Returns the function that starts it, whether it is under way,
 * and why it failed, which tells when the draft was made but its files were not uploaded.
 */
export function useLibraryItemCreation(onCreated: (itemId: string) => void) {
  const registry = useBrowserFileRegistry();
  const [createItem] = useCreateLibraryItemMutation();
  const [upload] = useUploadLibraryFileMutation();
  const [putSubtitles] = usePutLibrarySubtitlesMutation();
  const [creation, setCreation] = useState<Creation>(idle);
  const fail = (error: unknown, fallback: string) =>
    setCreation({
      isCreating: false,
      failure: libraryFailureMessage(error, fallback),
    });
  const create = async ({ draft, file, subtitles }: NewLibraryItem) => {
    if (registry === null) return fail(unreachableFile, "");
    setCreation({ isCreating: true, failure: null });
    const created = await createItem(draft)
      .unwrap()
      .then(
        (item) => item,
        (error: unknown) => {
          fail(
            error,
            "The item couldn't be added to the library. Try again in a moment.",
          );
          return null;
        },
      );
    if (created === null) return;
    try {
      await uploadFromRegistry(registry, file, (picked) =>
        upload({ itemId: created.id, file: picked }).unwrap(),
      );
      if (subtitles) {
        const texts = await librarySubtitlesOf(subtitles);
        await putSubtitles({ itemId: created.id, subtitles: texts }).unwrap();
      }
      setCreation(idle);
      onCreated(created.id);
    } catch (error) {
      fail(
        error,
        `${draft.title} was added as a draft, but its files couldn't be uploaded. Open it below to upload them again.`,
      );
    }
  };
  return { create, ...creation };
}

const idle: Creation = { isCreating: false, failure: null };
