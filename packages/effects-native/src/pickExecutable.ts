import { open } from "@tauri-apps/plugin-dialog";

/** Opens the native file dialog for a program, without a filter, since programs often have no extension. Resolves null when the user cancels. */
export async function pickExecutable(): Promise<string | null> {
  return open({ multiple: false, directory: false });
}
