import type { AccountRole, AccountUser } from "@easyimmerse/types";
import type { ServerRequest } from "../server/serverRequest.ts";
import type { AccountVia } from "../server/serverSelectors.ts";
import type { UserAccess } from "./userManagement.ts";

/** A request that changes an account's access. */
type AccessRequest = Extract<
  ServerRequest,
  { kind: "setUserRole" | "setLibraryManager" }
>;

/**
 * Returns the requests that check or uncheck one kind of access of an account, as it was listed.
 * A server admin always has full access and manages the library, so unchecking Server admin keeps both, as the boxes showed them.
 */
export function userAccessRequests(
  via: AccountVia,
  user: AccountUser,
  access: UserAccess,
): AccessRequest[] {
  const role = (role: AccountRole) =>
    ({ kind: "setUserRole", via, userId: user.id, role }) as const;
  const library = (managesLibrary: boolean) =>
    ({
      kind: "setLibraryManager",
      via,
      userId: user.id,
      managesLibrary,
    }) as const;
  const isAdministrator = user.role === "administrator";
  if (access === "serverAdmin")
    return isAdministrator
      ? [role("privileged"), ...(user.manages_library ? [] : [library(true)])]
      : [role("administrator")];
  if (isAdministrator) return [];
  if (access === "fullAccess")
    return [role(user.role === "privileged" ? "library_user" : "privileged")];
  return [library(!user.manages_library)];
}
