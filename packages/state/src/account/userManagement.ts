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
export type UserChange = "setUserRole" | "setLibraryManager" | "deleteUser";

/**
 * One kind of access an account can have, which an administrator checks or unchecks:
 * being a server admin, being a library admin, or having full access, as a subscriber or an account on a self-hosted server has.
 */
export type UserAccess = "serverAdmin" | "libraryAdmin" | "fullAccess";

/** What an administrator is doing to the server's accounts. The accounts themselves come from the server. */
export type UserManagementState = {
  newUser: NewUserForm;
  /** The id of the account whose deletion waits for the administrator to confirm it. */
  deletionToConfirm: string | null;
  /** Why the last change of an account failed, until another change is made. */
  changeFailure: { change: UserChange; failure: RequestFailure } | null;
  /** What the administrator typed to filter the accounts by email address. */
  search: string;
  /** Which page of the matching accounts shows, counting from zero. */
  page: number;
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
  search: "",
  page: 0,
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

/** The id of the request that lets an account manage the library, or stops it. */
export const setLibraryManagerRequestId = (userId: string) =>
  `account/users/library-manager/${userId}`;

/** The id of the request that deletes an account. */
export const deleteUserRequestId = (userId: string) =>
  `account/users/delete/${userId}`;
