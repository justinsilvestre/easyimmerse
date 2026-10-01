import type { FilePickPurpose, PickedFile } from "./chosenFile.ts";

export const filePickActions = {
  filePickRequested: (purpose: FilePickPurpose) =>
    ({ type: "filePickRequested", purpose }) as const,
  fileChosen: (purpose: FilePickPurpose, file: PickedFile) =>
    ({ type: "fileChosen", purpose, file }) as const,
  filePickCancelled: () => ({ type: "filePickCancelled" }) as const,
  /** Tells that a component has acted on the chosen file. */
  chosenFileHandled: () => ({ type: "chosenFileHandled" }) as const,
};
