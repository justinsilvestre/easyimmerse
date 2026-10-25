import type { AppAction } from "../app/appAction.ts";
import type { ReadableState } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { selectIsRequestInFlight } from "../operations/operationsSelectors.ts";
import { isAborted } from "../server/isAborted.ts";
import type { RequestSettled } from "../server/serverRequest.ts";
import { userAccessRequests } from "./userAccessRequests.ts";
import {
  canSubmitNewUser,
  createUserRequestId,
  deleteUserRequestId,
  initialNewUserForm,
  setLibraryManagerRequestId,
  setUserRoleRequestId,
  type UserManagementState,
} from "./userManagement.ts";

/**
 * Keeps the form that creates an account, the search through the accounts and the deletion waiting to be confirmed,
 * sends the creations, changes of access and confirmed deletions, and keeps why the last of them failed.
 */
export function updateUserManagement(
  users: UserManagementState,
  action: AppAction,
  { operations }: Pick<ReadableState, "operations">,
) {
  switch (action.type) {
    case "newUserFormChanged":
      return updated({
        ...users,
        newUser: { ...users.newUser, ...action.changes, failure: null },
      });
    case "newUserSubmitted": {
      const { email, password, role } = users.newUser;
      const isCreating = selectIsRequestInFlight(
        { operations },
        createUserRequestId,
      );
      if (!canSubmitNewUser(users.newUser, isCreating)) return updated(users);
      return updated(users, {
        type: "sendRequest",
        id: createUserRequestId,
        request: {
          kind: "createUser",
          via: action.via,
          request: { email, password, role },
        },
      });
    }
    case "userSearchChanged":
      return updated({ ...users, search: action.query });
    case "userAccessToggled":
      return updated(
        { ...users, changeFailure: null },
        ...userAccessRequests(action.via, action.user, action.access).map(
          (request) => ({
            type: "sendRequest" as const,
            id:
              request.kind === "setUserRole"
                ? setUserRoleRequestId(request.userId)
                : setLibraryManagerRequestId(request.userId),
            request,
          }),
        ),
      );
    case "userDeletionAsked":
      return updated({ ...users, deletionToConfirm: action.userId });
    case "userDeletionCancelled":
      return updated({ ...users, deletionToConfirm: null });
    case "userDeletionConfirmed": {
      const userId = users.deletionToConfirm;
      if (userId === null) return updated(users);
      return updated(
        { ...users, deletionToConfirm: null, changeFailure: null },
        {
          type: "sendRequest",
          id: deleteUserRequestId(userId),
          request: { kind: "deleteUser", via: action.via, userId },
        },
      );
    }
    case "requestSettled":
      return updated(settled(users, action));
    default:
      return updated(users);
  }
}

function settled(
  users: UserManagementState,
  { request, outcome }: RequestSettled,
): UserManagementState {
  if (isAborted(outcome)) return users;
  if (request.kind === "createUser")
    return {
      ...users,
      newUser: outcome.ok
        ? initialNewUserForm
        : { ...users.newUser, failure: outcome.error },
    };
  if (
    (request.kind === "setUserRole" ||
      request.kind === "setLibraryManager" ||
      request.kind === "deleteUser") &&
    !outcome.ok
  )
    return {
      ...users,
      changeFailure: { change: request.kind, failure: outcome.error },
    };
  return users;
}
