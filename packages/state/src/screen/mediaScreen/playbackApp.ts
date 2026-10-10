import type { AppState } from "../../app/appState.ts";

/** The slices of the app state that the playback rules read: the shown media screen and the preferences. */
export type PlaybackApp = Pick<AppState, "route" | "screen" | "preferences">;
