/** The environment in which the app is running. */
export type Platform = "web" | "desktop" | "mobile" | "extension";

export type Screen = "home" | "systemStatus";

export type AppState = {
  platform: Platform;
  screen: Screen;
  /**
   * The address of the API server in use.
   * It is `null` when no server is available, or before a server has been looked for.
   */
  serverUrl: string | null;
};

export function createInitialAppState(platform: Platform): AppState {
  return { platform, screen: "home", serverUrl: null };
}
