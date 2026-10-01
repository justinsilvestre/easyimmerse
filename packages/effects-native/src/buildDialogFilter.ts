import type { FilePickPurpose } from "@easyimmerse/state";
import type { DialogFilter } from "@tauri-apps/plugin-dialog";

const filterNames: Record<FilePickPurpose["kind"], string> = {
  media: "Media",
  subtitles: "Subtitles",
  dictionary: "Dictionaries",
};

/** Turns accepted extensions such as `.srt` into the dialog plugin's filter, which takes them without the dot. */
export function buildDialogFilter(
  purpose: FilePickPurpose,
  accept: readonly string[],
): DialogFilter {
  return {
    name: filterNames[purpose.kind],
    extensions: accept.map((extension) => extension.replace(/^\./, "")),
  };
}
