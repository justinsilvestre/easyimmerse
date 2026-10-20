import type { AccountRole } from "@easyimmerse/types";
import type { RequestFailure } from "../server/serverRequest.ts";

/** The form through which an administrator creates an account. */
export type NewUserForm = {
  email: string;
  password: string;
  role: AccountRole;
  /** Why the last creation failed, until the form changes or a creation succeeds. */
  failure: RequestFailure | null;
};

/** A change an administrator makes to an existing account. */
export type UserChange = "setUserRole" | "deleteUser";

/** What an administrator is doing to the server's accounts. The accounts themselves come from the server. */
export type UserManagementState = {
  newUser: NewUserForm;
  /** The id of the account whose deletion waits for the administrator to confirm it. */
  deletionToConfirm: string | null;
  /** Why the last change of an account failed, until another change is made. */
  changeFailure: { change: UserChange; failure: RequestFailure } | null;
};

export const initialNewUserForm: NewUserForm = {
  email: "",
  password: "",
  role: "library_user",
  failure: null,
};

export const initialUserManagement: UserManagementState = {
  newUser: initialNewUserForm,
  deletionToConfirm: null,
  changeFailure: null,
};

/** Whether the form that creates an account can be sent: both fields are filled in and no creation is under way. */
export function canSubmitNewUser(form: NewUserForm, isCreating: boolean) {
  return !isCreating && form.email.trim() !== "" && form.password !== "";
}

/** The id of the request that creates an account. */
export const createUserRequestId = "account/users/create";

/** The id of the request that changes an account's role. */
export const setUserRoleRequestId = (userId: string) =>
  `account/users/role/${userId}`;

/** The id of the request that deletes an account. */
export const deleteUserRequestId = (userId: string) =>
  `account/users/delete/${userId}`;
