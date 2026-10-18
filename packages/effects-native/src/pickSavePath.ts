import type { SavePathPick } from "@easyimmerse/state";
import { type SaveDialogOptions, save } from "@tauri-apps/plugin-dialog";

/** Opens the native save dialog, suggesting the file name and offering only files of its extension. */
export async function pickSavePath(
  suggestedFileName: string,
): Promise<SavePathPick> {
  return savePathPickOf(await save(saveDialogOptions(suggestedFileName)));
}

/** The save dialog's options: the suggested name, and a filter of its extension when it has one. */
export function saveDialogOptions(
  suggestedFileName: string,
): SaveDialogOptions {
  const extension = suggestedFileName.match(/\.([^./\\]+)$/)?.[1];
  if (extension === undefined) return { defaultPath: suggestedFileName };
  return {
    defaultPath: suggestedFileName,
    filters: [
      { name: `${extension.toUpperCase()} file`, extensions: [extension] },
    ],
  };
}

/** The pick a save dialog's answer stands for: null when the user cancelled. */
export function savePathPickOf(path: string | null): SavePathPick {
  return path === null ? { kind: "cancelled" } : { kind: "path", path };
}
