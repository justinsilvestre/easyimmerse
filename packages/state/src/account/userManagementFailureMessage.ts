import type { RequestFailure } from "../server/serverRequest.ts";
import type { UserChange } from "./userManagement.ts";

/** What an administrator asked of the server's accounts. */
type UserRequest = "createUser" | UserChange;

const lastAdministratorMessages: Record<UserChange, string> = {
  setUserRole:
    "This is the server's only administrator account, so it keeps its role. Make another account an administrator first.",
  deleteUser:
    "This is the server's only administrator account, so it cannot be deleted. Make another account an administrator first.",
};

const messagesByCode: Record<string, string> = {
  email_taken: "An account with this email address already exists.",
  password_too_short: "The password must be at least 8 characters long.",
  invalid_email: "This email address is not valid.",
  forbidden: "Only an administrator may manage this server's accounts.",
};

const failedRequests: Record<UserRequest, string> = {
  createUser: "The account could not be created",
  setUserRole: "The role could not be changed",
  deleteUser: "The account could not be deleted",
};

/** Tells an administrator why what they asked of the server's accounts failed. */
export function userManagementFailureMessage(
  failure: RequestFailure,
  request: UserRequest,
): string {
  if (failure.code === "last_administrator" && request !== "createUser")
    return lastAdministratorMessages[request];
  const known = failure.code && messagesByCode[failure.code];
  if (known) return known;
  if (failure.status === "NETWORK")
    return `${failedRequests[request]}, because the server could not be reached. Check your connection.`;
  return `${failedRequests[request]}: ${failure.message}`;
}
