import type { Screen } from "./AppState.ts";

export const appActions = {
  appStarted: () => ({ type: "appStarted" }) as const,
  screenOpened: (screen: Screen) => ({ type: "screenOpened", screen }) as const,
  serverUrlResolved: (serverUrl: string | null) =>
    ({ type: "serverUrlResolved", serverUrl }) as const,
};

export type AppAction = ReturnType<
  (typeof appActions)[keyof typeof appActions]
>;
