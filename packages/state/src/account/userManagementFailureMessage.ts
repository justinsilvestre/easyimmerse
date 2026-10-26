import type { RequestFailure } from "../server/serverRequest.ts";
import type { UserChange } from "./userManagement.ts";

/** What an administrator asked of the server's accounts. */
type UserRequest = "createUser" | UserChange;

const lastAdministratorMessages: Partial<Record<UserChange, string>> = {
  setUserRole:
    "You can't take Server admin away from the server's only server admin. Make another account a server admin first.",
  deleteUser:
    "You can't delete the server's only server admin. Make another account a server admin first.",
};

const messagesByCode: Record<string, string> = {
  email_taken: "An account with this email address already exists.",
  password_too_short: "The password must be at least 8 characters long.",
  password_too_long: "The password is too long.",
  invalid_email: "This email address is not valid.",
  forbidden: "Only a server admin may manage this server's accounts.",
};

const failedRequests: Record<UserRequest, string> = {
  createUser: "The account could not be created",
  setUserRole: "The account's access could not be changed",
  setLibraryManager: "Library admin could not be changed",
  deleteUser: "The account could not be deleted",
};

/** Tells an administrator why what they asked of the server's accounts failed. */
export function userManagementFailureMessage(
  failure: RequestFailure,
  request: UserRequest,
): string {
  const lastAdministrator =
    request === "createUser" ? undefined : lastAdministratorMessages[request];
  if (failure.code === "last_administrator" && lastAdministrator)
    return lastAdministrator;
  const known = failure.code && messagesByCode[failure.code];
  if (known) return known;
  if (failure.status === "NETWORK")
    return `${failedRequests[request]}, because the server could not be reached. Check your connection.`;
  return `${failedRequests[request]}: ${failure.message}`;
}
