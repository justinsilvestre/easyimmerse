import type { AppRoot } from "../app/createAppStore.ts";
import type { ServerConfig } from "./serverState.ts";

/**
 * Where the person's work is kept: in this browser when the app runs without a server,
 * on the native app's built-in server, or on the server of the account the person logged in to.
 */
export type WorkHome = "browser" | "accountServer" | "builtInServer";

/**
 * The server whose accounts an account request reaches:
 * the one the app is connected to, or the remote that the native app's built-in server is linked to.
 */
export type AccountVia = "self" | "linkedRemote";

/** Returns the server the app talks to, or null when the app runs offline. */
export const selectServerConfig = (state: AppRoot) => state.app.server.config;

/** Returns the native app that runs the app's server inside itself, or null when the server is reached over the network or there is none. */
export const selectBundledServerPlatform = (state: AppRoot) =>
  state.app.server.config?.bundledIn ?? null;

/** Returns where the person's work is kept. */
export function selectWorkHome(state: AppRoot): WorkHome {
  const config = state.app.server.config;
  if (config === null) return "browser";
  return config.bundledIn === undefined ? "accountServer" : "builtInServer";
}

/** Returns which server the Account section's requests reach. */
export function selectAccountVia(state: AppRoot): AccountVia {
  return accountViaOf(state.app.server.config);
}

/** Returns which server the account requests of an app connected to the given server reach. */
export function accountViaOf(config: ServerConfig | null): AccountVia {
  return config?.bundledIn === undefined ? "self" : "linkedRemote";
}
