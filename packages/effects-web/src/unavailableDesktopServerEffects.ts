import type { Effects } from "@easyimmerse/state";

/** The effects of the desktop app's server controls and its program picker. */
export type DesktopServerEffects = Pick<
  Effects,
  | "pickExecutable"
  | "readDesktopServerSettings"
  | "saveDesktopServerSettings"
  | "startDesktopServer"
  | "stopDesktopServer"
  | "readDesktopServerStatus"
  | "readDesktopServerLogs"
  | "subscribeToDesktopServerStatus"
>;

const unavailableMessage = "The server controls are not available in this app.";

async function refuse(): Promise<never> {
  throw new Error(unavailableMessage);
}

/** The server controls of an app that runs no server of its own: every request is refused and no status ever arrives. */
export const unavailableDesktopServerEffects: DesktopServerEffects = {
  pickExecutable: async () => null,
  readDesktopServerSettings: refuse,
  saveDesktopServerSettings: refuse,
  startDesktopServer: refuse,
  stopDesktopServer: refuse,
  readDesktopServerStatus: refuse,
  readDesktopServerLogs: refuse,
  subscribeToDesktopServerStatus: () => () => undefined,
};
