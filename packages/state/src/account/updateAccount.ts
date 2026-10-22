import { combineUpdates } from "../app/combineUpdates.ts";
import type { Feature, ReadableState } from "../app/feature.ts";
import {
  type ConfirmationEmailStatus,
  initialConfirmationEmail,
} from "./confirmationEmail.ts";
import { type DevicesState, initialDevices } from "./devices.ts";
import type { MailedLinkFlow } from "./mailedLinkFlow.ts";
import { initialSignInForm, type SignInForm } from "./signInForm.ts";
import { updateConfirmationEmail } from "./updateConfirmationEmail.ts";
import { updateDevices } from "./updateDevices.ts";
import { updateMailedLink } from "./updateMailedLink.ts";
import { updateSignIn } from "./updateSignIn.ts";
import { updateUserManagement } from "./updateUserManagement.ts";
import {
  initialUserManagement,
  type UserManagementState,
} from "./userManagement.ts";

/**
 * The account slice: the form through which a person signs in, what an administrator is doing to the server's accounts,
 * the logging out of the account's devices, the request for another confirmation link, and the mailed link the app was opened with.
 * Who is signed in, which accounts and devices there are, come from the server, not from here.
 */
export type AccountState = {
  signInForm: SignInForm;
  userManagement: UserManagementState;
  devices: DevicesState;
  confirmationEmail: ConfirmationEmailStatus;
  mailedLink: MailedLinkFlow | null;
};

/** Updates the sign-in form, the management of the server's accounts, the account's devices and the following of mailed links. */
export const updateAccount = combineUpdates<
  AccountState,
  [Pick<ReadableState, "server" | "operations">]
>({
  signInForm: updateSignIn,
  userManagement: updateUserManagement,
  devices: updateDevices,
  confirmationEmail: updateConfirmationEmail,
  mailedLink: updateMailedLink,
});

/** The account as a feature. */
export const accountFeature: Feature<AccountState, "server" | "operations"> = {
  initialState: {
    signInForm: initialSignInForm,
    userManagement: initialUserManagement,
    devices: initialDevices,
    confirmationEmail: initialConfirmationEmail,
    mailedLink: null,
  },
  update: updateAccount,
};
