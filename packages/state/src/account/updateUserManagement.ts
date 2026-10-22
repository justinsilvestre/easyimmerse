import type { AppAction } from "../app/appAction.ts";
import type { ReadableState } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { selectIsRequestInFlight } from "../operations/operationsSelectors.ts";
import { isAborted } from "../server/isAborted.ts";
import type { RequestSettled } from "../server/serverRequest.ts";
import { accountViaOf } from "../server/serverSelectors.ts";
import {
  canSubmitNewUser,
  createUserRequestId,
  deleteUserRequestId,
  initialNewUserForm,
  setUserRoleRequestId,
  type UserManagementState,
} from "./userManagement.ts";

/**
 * Keeps the form that creates an account and the deletion waiting to be confirmed,
 * sends the creations, role changes and confirmed deletions, and keeps why the last of them failed.
 */
export function updateUserManagement(
  users: UserManagementState,
  action: AppAction,
  { operations, server }: Pick<ReadableState, "operations" | "server">,
) {
  const via = accountViaOf(server.config);
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
          via,
          request: { email, password, role },
        },
      });
    }
    case "userRoleChosen":
      return updated(
        { ...users, changeFailure: null },
        {
          type: "sendRequest",
          id: setUserRoleRequestId(action.userId),
          request: {
            kind: "setUserRole",
            via,
            userId: action.userId,
            role: action.role,
          },
        },
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
          request: { kind: "deleteUser", via, userId },
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
    (request.kind === "setUserRole" || request.kind === "deleteUser") &&
    !outcome.ok
  )
    return {
      ...users,
      changeFailure: { change: request.kind, failure: outcome.error },
    };
  return users;
}
