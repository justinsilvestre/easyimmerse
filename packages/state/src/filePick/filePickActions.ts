import type { FilePickPurpose, PickedFile } from "./chosenFile.ts";

export const filePickActions = {
  filePickRequested: (purpose: FilePickPurpose) =>
    ({ type: "filePickRequested", purpose }) as const,
  fileChosen: (purpose: FilePickPurpose, file: PickedFile) =>
    ({ type: "fileChosen", purpose, file }) as const,
  filePickCancelled: () => ({ type: "filePickCancelled" }) as const,
  /** Carries the bytes of the chosen file stored in the browser under the key. */
  chosenFileBytesRead: (key: string, bytes: Uint8Array) =>
    ({ type: "chosenFileBytesRead", key, bytes }) as const,
  /** Tells that a component has acted on the chosen file. */
  chosenFileHandled: () => ({ type: "chosenFileHandled" }) as const,
};
