import type { UpdateHandlers } from "../updateHandlers.ts";
import { acceptedExtensions } from "./acceptedExtensions.ts";

export const filePickHandlers = {
  filePickRequested: (state, { purpose }) => [
    { ...state, pendingFilePick: purpose },
    [{ type: "pickFile", purpose, accept: acceptedExtensions[purpose.kind] }],
  ],
  fileChosen: (state, { purpose, file }) => [
    { ...state, pendingFilePick: null, chosenFile: { purpose, file } },
    [],
  ],
  filePickCancelled: (state) => [{ ...state, pendingFilePick: null }, []],
  chosenFileHandled: (state) => [{ ...state, chosenFile: null }, []],
} satisfies Partial<UpdateHandlers>;
