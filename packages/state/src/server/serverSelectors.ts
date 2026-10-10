import type { AppRoot } from "../app/createAppStore.ts";

/** Returns the server the app talks to, or null when the app runs offline. */
export const selectServerConfig = (state: AppRoot) => state.app.server.config;
