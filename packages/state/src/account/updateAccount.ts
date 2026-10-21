import { combineUpdates } from "../app/combineUpdates.ts";
import type { Feature, ReadableState } from "../app/feature.ts";
import { initialSignInForm, type SignInForm } from "./signInForm.ts";
import { updateSignIn } from "./updateSignIn.ts";
import { updateUserManagement } from "./updateUserManagement.ts";
import {
  initialUserManagement,
  type UserManagementState,
} from "./userManagement.ts";

/**
 * The account slice: the form through which a person signs in, and what an administrator is doing to the server's accounts.
 * Who is signed in, and which accounts there are, come from the server, not from here.
 */
export type AccountState = {
  signInForm: SignInForm;
  userManagement: UserManagementState;
};

/** Updates the sign-in form and the management of the server's accounts. */
export const updateAccount = combineUpdates<
  AccountState,
  [Pick<ReadableState, "server" | "operations">]
>({ signInForm: updateSignIn, userManagement: updateUserManagement });

/** The account as a feature. */
export const accountFeature: Feature<AccountState, "server" | "operations"> = {
  initialState: {
    signInForm: initialSignInForm,
    userManagement: initialUserManagement,
  },
  update: updateAccount,
};
