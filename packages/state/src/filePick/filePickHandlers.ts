import type { AppState } from "../appState.ts";
import type { Effect } from "../effect.ts";
import type { UpdateHandlers } from "../updateHandlers.ts";
import { acceptedExtensions } from "./acceptedExtensions.ts";
import type { ChosenFile } from "./chosenFile.ts";

export const filePickHandlers = {
  filePickRequested: (state, { purpose }) => [
    { ...state, pendingFilePick: purpose },
    [{ type: "pickFile", purpose, accept: acceptedExtensions[purpose.kind] }],
  ],
  fileChosen: (state, { purpose, file }) => {
    const chosenFile: ChosenFile = { purpose, file, bytes: null };
    return [
      { ...state, pendingFilePick: null, chosenFile },
      readChosenFileBytes(chosenFile),
    ];
  },
  filePickCancelled: (state) => [{ ...state, pendingFilePick: null }, []],
  chosenFileBytesRead: (state, { key, bytes }) => [
    isChosenFileStoredAt(state, key)
      ? { ...state, chosenFile: { ...state.chosenFile, bytes } }
      : state,
    [],
  ],
  chosenFileHandled: (state) => [{ ...state, chosenFile: null }, []],
} satisfies Partial<UpdateHandlers>;

/** Builds an effect reading a dictionary the browser stored, since the server cannot read it from a path. */
function readChosenFileBytes({ purpose, file }: ChosenFile): Effect[] {
  if (purpose.kind !== "dictionary" || file.source.kind !== "browser_file")
    return [];
  return [
    {
      type: "readStoredFileBytes",
      key: file.source.key,
      target: { kind: "chosenFile" },
    },
  ];
}

function isChosenFileStoredAt(
  state: AppState,
  key: string,
): state is AppState & { chosenFile: ChosenFile } {
  const source = state.chosenFile?.file.source;
  return source?.kind === "browser_file" && source.key === key;
}
