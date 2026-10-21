import type { AppRoot } from "../app/createAppStore.ts";

/** Returns the server the app talks to, or null when the app runs offline. */
export const selectServerConfig = (state: AppRoot) => state.app.server.config;

/** Returns the native app that runs the app's server inside itself, or null when the server is reached over the network or there is none. */
export const selectBundledServerPlatform = (state: AppRoot) =>
  state.app.server.config?.bundledIn ?? null;
