import type { PickedDictionaryFile } from "@easyimmerse/state";
import { type DialogFilter, open } from "@tauri-apps/plugin-dialog";
import { basename } from "./basename.ts";
import { buildDialogFilter } from "./buildDialogFilter.ts";

/** Asks for one file with the given filters and resolves its path, or null when the user cancels. */
export type OpenFileDialog = (options: {
  multiple: false;
  directory: false;
  filters: DialogFilter[];
}) => Promise<string | null>;

/** Builds the dictionary file picker on a native file dialog. The server reads the archive from its path. */
export function createPickDictionaryFile(
  openFileDialog: OpenFileDialog,
): () => Promise<PickedDictionaryFile | null> {
  return async () => {
    const path = await openFileDialog({
      multiple: false,
      directory: false,
      filters: [buildDialogFilter("Dictionaries", [".zip"])],
    });
    if (path === null) return null;
    return { name: basename(path), source: { kind: "path", path } };
  };
}

export const pickDictionaryFile = createPickDictionaryFile(open);
