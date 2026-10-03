import type { PickedMediaFile } from "@easyimmerse/state";
import { open } from "@tauri-apps/plugin-dialog";
import { basename } from "./basename.ts";
import { buildDialogFilter } from "./buildDialogFilter.ts";

/** Opens the native file dialog for a media file. The server reads the file from its path. */
export async function pickMediaFile(
  accept: readonly string[],
): Promise<PickedMediaFile | null> {
  const path = await open({
    multiple: false,
    directory: false,
    filters: [buildDialogFilter("Media", accept)],
  });
  if (path === null) return null;
  return { name: basename(path), source: { kind: "path", path } };
}
