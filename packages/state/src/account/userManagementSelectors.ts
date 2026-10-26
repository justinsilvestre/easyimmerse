import type { AccountRole } from "@easyimmerse/types";
import { createSelector } from "reselect";
import type { AppRoot } from "../app/createAppStore.ts";
import { selectIsRequestInFlight } from "../operations/operationsSelectors.ts";
import {
  canSubmitNewUser,
  createUserRequestId,
  deleteUserRequestId,
  setLibraryManagerRequestId,
  setUserRoleRequestId,
  type UserChange,
} from "./userManagement.ts";
import { userManagementFailureMessage } from "./userManagementFailureMessage.ts";

/** The form that creates an account, as it shows. */
export type NewUserFormView = {
  email: string;
  password: string;
  role: AccountRole;
  isCreating: boolean;
  canSubmit: boolean;
  /** Why the last creation failed, while it stands. */
  failureMessage: string | null;
};

const selectUsers = (state: AppRoot) => state.app.account.userManagement;

/** Returns the form that creates an account as it shows, which keeps its reference until the form or its request changes. */
export const selectNewUserForm = createSelector(
  [
    (state: AppRoot) => selectUsers(state).newUser,
    (state: AppRoot) => selectIsRequestInFlight(state.app, createUserRequestId),
  ],
  (newUser, isCreating): NewUserFormView => ({
    email: newUser.email,
    password: newUser.password,
    role: newUser.role,
    isCreating,
    canSubmit: canSubmitNewUser(newUser, isCreating),
    failureMessage:
      newUser.failure &&
      userManagementFailureMessage(newUser.failure, "createUser"),
  }),
);

/** Returns the id of the account whose deletion waits to be confirmed, or null. */
export const selectDeletionToConfirm = (state: AppRoot) =>
  selectUsers(state).deletionToConfirm;

/** Returns why the last change of an account's role, or its deletion, failed, or null. */
export const selectUserChangeFailureMessage = createSelector(
  [(state: AppRoot) => selectUsers(state).changeFailure],
  (changeFailure) =>
    changeFailure &&
    userManagementFailureMessage(changeFailure.failure, changeFailure.change),
);

/** Returns what the administrator typed to filter the accounts by email address. */
export const selectUserSearch = (state: AppRoot) => selectUsers(state).search;

/** Returns which page of the matching accounts shows, counting from zero. */
export const selectUserPage = (state: AppRoot) => selectUsers(state).page;

/** Returns the change under way to the account: its deletion, a change of its role or of its library permission, or null. */
export function selectUserChangeInFlight(
  state: AppRoot,
  userId: string,
): UserChange | null {
  if (selectIsRequestInFlight(state.app, deleteUserRequestId(userId)))
    return "deleteUser";
  if (selectIsRequestInFlight(state.app, setUserRoleRequestId(userId)))
    return "setUserRole";
  if (selectIsRequestInFlight(state.app, setLibraryManagerRequestId(userId)))
    return "setLibraryManager";
  return null;
}
