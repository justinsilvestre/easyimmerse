import type { DialogFilter } from "@tauri-apps/plugin-dialog";

/** Turns accepted extensions such as `.srt` into the dialog plugin's filter, which takes them without the dot. */
export function buildDialogFilter(accept: readonly string[]): DialogFilter {
  return {
    name: "Subtitles",
    extensions: accept.map((extension) => extension.replace(/^\./, "")),
  };
}
