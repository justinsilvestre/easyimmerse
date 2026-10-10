import type { RootState } from "../app/createAppStore.ts";

/** Returns the notices on screen, oldest first. */
export const selectNotices = (state: RootState) => state.app.notices.shown;
