import type { PickedDictionaryFile } from "@easyimmerse/state";
import { open } from "@tauri-apps/plugin-dialog";
import { basename } from "./basename.ts";
import { buildDialogFilter } from "./buildDialogFilter.ts";

/** Opens the native file dialog for a dictionary file. The server reads the file, and any siblings it needs, from its path. */
export async function pickDictionaryFile(
  accept: readonly string[],
): Promise<PickedDictionaryFile | null> {
  const path = await open({
    multiple: false,
    directory: false,
    filters: [buildDialogFilter("Dictionaries", accept)],
  });
  if (path === null) return null;
  return { name: basename(path), source: { kind: "path", path } };
}
