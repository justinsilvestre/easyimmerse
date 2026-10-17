import type { SaveCopyOutcome, SavePathPick } from "@easyimmerse/state";
import { invoke } from "@tauri-apps/api/core";
import { appCacheDir, join } from "@tauri-apps/api/path";

/** Answers a path in the app's cache directory, where the server writes the file before the user chooses where to keep a copy. */
export async function pickStagingPath(
  suggestedFileName: string,
): Promise<SavePathPick> {
  const path = await join(await appCacheDir(), suggestedFileName);
  return { kind: "staging", path };
}

/** Lets the user choose where to keep a copy of the staged file in the system's document picker, which then removes the staged file. */
export async function saveStagedCopy(
  path: string,
  fileName: string,
): Promise<SaveCopyOutcome> {
  const { saved } = await invoke<{ saved: boolean }>(
    "plugin:save-copy|save_copy",
    { path, fileName, mimeType: "application/octet-stream" },
  );
  return saved ? { kind: "saved" } : { kind: "cancelled" };
}
