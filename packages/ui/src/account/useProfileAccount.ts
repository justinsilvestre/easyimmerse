import {
  useGetCurrentPrincipalQuery,
  useGetSyncStatusQuery,
} from "@easyimmerse/backend";
import {
  type RootState,
  selectServerConfig,
  selectServerName,
  selectSyncLink,
  selectWorkHome,
} from "@easyimmerse/state";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { selectLoginState } from "./selectLoginState.ts";

/**
 * Who the app is logged in as, as the Profile menu shows it.
 * A logged-in app names its server, and the account's email address once it is known;
 * the owner of a server reached over the network, who needs no account, has none.
 */
export type ProfileAccount =
  | { kind: "unknown" | "loggedOut" }
  | { kind: "loggedIn"; email: string | null; serverName: string };

/** Returns who the app is logged in as, asking the server when it has not said yet. */
export function useProfileAccount(): ProfileAccount {
  const workHome = useAppSelector(selectWorkHome);
  useGetSyncStatusQuery(undefined, { skip: workHome !== "builtInServer" });
  const principal = useGetCurrentPrincipalQuery("self", {
    skip: workHome !== "accountServer",
  }).data;
  const loginState = useAppSelector(selectLoginState);
  const linkedEmail = useAppSelector(selectLinkedEmail);
  const serverName = useAppSelector(selectAccountServerName);
  if (loginState !== "loggedIn" || serverName === null)
    return { kind: loginState === "unknown" ? "unknown" : "loggedOut" };
  const email =
    principal?.kind === "account" ? principal.user.email : linkedEmail;
  return { kind: "loggedIn", email, serverName };
}

/** Returns the email address of the account that the built-in server is linked to, or null. */
function selectLinkedEmail(state: RootState): string | null {
  return selectSyncLink(state)?.account_email ?? null;
}

/** Returns the name of the server that holds the account: the built-in server's linked remote, or the app's own server. */
function selectAccountServerName(state: RootState): string | null {
  const serverUrl =
    selectSyncLink(state)?.server_url ?? selectServerConfig(state)?.serverUrl;
  return serverUrl === undefined ? null : selectServerName(state, serverUrl);
}
