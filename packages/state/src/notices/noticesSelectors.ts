import type { AppRoot } from "../app/createAppStore.ts";

/** Returns the notices on screen, oldest first. */
export const selectNotices = (state: AppRoot) => state.app.notices.shown;
