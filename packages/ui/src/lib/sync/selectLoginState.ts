import {
  type RootState,
  selectServerConfig,
  selectSyncStatus,
} from "@easyimmerse/state";

/**
 * Tells whether the app is logged in to an account: connected to a server other than its own built-in one,
 * or with a built-in server that is linked to a remote. It is unknown until the built-in server has reported whether it is linked.
 */
export function selectLoginState(
  state: RootState,
): "loggedIn" | "loggedOut" | "unknown" {
  const server = selectServerConfig(state);
  if (server === null) return "loggedOut";
  if (server.bundledIn === undefined) return "loggedIn";
  const status = selectSyncStatus(state);
  if (status === null) return "unknown";
  return status.link === null ? "loggedOut" : "loggedIn";
}
