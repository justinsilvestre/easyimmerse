import { createSelector } from "reselect";
import type { AppRoot } from "../app/createAppStore.ts";
import { mailedLinkFailureMessage } from "./mailedLinkFailureMessage.ts";
import {
  canSubmitMailedLink,
  type MailedLinkFlow,
  type MailedLinkStatus,
  mailedLinkServerUrlOf,
  needsServerAddress,
} from "./mailedLinkFlow.ts";
import { assessPasswordStrength } from "./passwordStrength.ts";

/** The mailed link the app was opened with, as the account settings screen shows it. */
export type MailedLinkView = {
  kind: MailedLinkFlow["kind"];
  status: MailedLinkStatus["kind"];
  /** Whether the person must type the address of the server that sent the link, since the app knows of none. */
  needsServerAddress: boolean;
  serverAddress: string;
  password: string;
  canSubmit: boolean;
  /** Why following the link failed, while it stands. */
  failureMessage: string | null;
};

const selectFlow = (state: AppRoot) => state.app.account.mailedLink;

const selectServer = (state: AppRoot) => state.app.server;

/** Returns the mailed link the app was opened with as it shows, or null when there is none. */
export const selectMailedLink = createSelector(
  [selectFlow, selectServer],
  (flow, server): MailedLinkView | null => {
    if (flow === null) return null;
    const serverUrl = mailedLinkServerUrlOf(flow, server);
    return {
      kind: flow.kind,
      status: flow.status.kind,
      needsServerAddress: needsServerAddress(server),
      serverAddress: flow.serverAddress,
      password: flow.password,
      canSubmit: canSubmitMailedLink(flow, server),
      failureMessage:
        flow.status.kind === "failed"
          ? mailedLinkFailureMessage(
              flow.kind,
              flow.status.failure,
              serverUrl ?? "that address",
              server.config !== null,
            )
          : null,
    };
  },
);

/** Returns how strong the new password chosen through a reset link is, once one is typed, and otherwise null. */
export const selectNewPasswordStrength = createSelector(
  [(state: AppRoot) => selectFlow(state)?.password ?? ""],
  (password) => (password === "" ? null : assessPasswordStrength(password)),
);
