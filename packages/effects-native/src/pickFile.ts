import type { FilePickPurpose, PickedFile } from "@easyimmerse/state";
import { open } from "@tauri-apps/plugin-dialog";
import { basename } from "./basename.ts";
import { buildDialogFilter } from "./buildDialogFilter.ts";

/** Opens the native file dialog. The picked file is passed to the server as a path, not read. */
export async function pickFile(
  purpose: FilePickPurpose,
  accept: readonly string[],
): Promise<PickedFile | null> {
  const path = await open({
    multiple: false,
    directory: false,
    filters: [buildDialogFilter(purpose, accept)],
  });
  if (path === null) return null;
  return { name: basename(path), source: { kind: "path", path } };
}
