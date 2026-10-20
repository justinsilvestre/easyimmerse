import type { AppRoot } from "../app/createAppStore.ts";
import { selectRecoverableWork } from "./recoverableWork.ts";

/** Tells whether the app runs without a server while flashcards are kept only on this device, waiting to be saved. */
export const selectIsWorkNotBackedUp = (state: AppRoot) =>
  state.app.server.config === null &&
  selectRecoverableWork(state.app).saves.length > 0;
