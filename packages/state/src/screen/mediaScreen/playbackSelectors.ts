import type { AppRoot } from "../../app/createAppStore.ts";
import type { PathPlayback } from "./pathPlayback.ts";

/** Returns what the media screen knows about playing its file from the server's disk, or null for any other file or screen. */
export const selectPathPlayback = (state: AppRoot): PathPlayback | null =>
  state.app.screen.main.kind === "media"
    ? state.app.screen.main.playback
    : null;

/** Returns the open modal dialog, or null when none is open. */
export const selectDialog = (state: AppRoot) => state.app.screen.dialog;
