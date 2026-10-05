import { open } from "@tauri-apps/plugin-dialog";
import { basename } from "./basename.ts";
import { buildDialogFilter } from "./buildDialogFilter.ts";

/** A file picked in the native dialog. The server reads it from its path; the app never reads it. */
export type PickedPath = {
  name: string;
  source: { kind: "path"; path: string };
};

/** Opens the native file dialog with one filter of the accepted extensions. Resolves null when the user cancels. */
export async function pickPath(
  filterName: string,
  accept: readonly string[],
): Promise<PickedPath | null> {
  const path = await open({
    multiple: false,
    directory: false,
    filters: [buildDialogFilter(filterName, accept)],
  });
  if (path === null) return null;
  return { name: basename(path), source: { kind: "path", path } };
}
