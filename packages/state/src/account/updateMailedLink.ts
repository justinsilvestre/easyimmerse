import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { dispatch } from "../app/dispatchEffect.ts";
import type { ReadableState } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { accountViaOf } from "../server/serverSelectors.ts";
import type { ServerState } from "../server/serverState.ts";
import { principalRefresh } from "./confirmationEmail.ts";
import {
  canSubmitMailedLink,
  type MailedLinkFlow,
  mailedLinkServerUrlOf,
  startMailedLinkFlow,
} from "./mailedLinkFlow.ts";

/**
 * Follows the link a server mailed, which the app was opened with, and opens the Account settings where the outcome shows.
 * A confirmation link is followed at once when the app knows which server sent it; a reset link waits for the new password.
 * A new password connects the app to the server with the session it opens, as signing in does.
 */
export function updateMailedLink(
  flow: MailedLinkFlow | null,
  action: AppAction,
  { server }: Pick<ReadableState, "server">,
) {
  switch (action.type) {
    case "mailedLinkOpened": {
      const opened = dispatch(
        actions.navigated({ type: "openAccountSettings" }),
      );
      const started = startMailedLinkFlow(action.link);
      if (started.kind === "resetPassword") return updated(started, opened);
      const [sending, effects] = submitted(started, server);
      return updated(sending, opened, ...effects);
    }
    case "mailedLinkFormChanged":
      if (flow === null || !canChange(flow)) return updated(flow);
      return updated({ ...flow, ...action.changes, status: { kind: "idle" } });
    case "mailedLinkSubmitted":
      return flow === null ? updated(flow) : submitted(flow, server);
    case "emailConfirmationAnswered":
      return confirmationAnswered(flow, action, server);
    case "newPasswordAnswered":
      return newPasswordAnswered(flow, action);
    case "signInFailed":
      // Connecting with the new password's session failed.
      if (flow?.kind !== "resetPassword" || flow.status.kind !== "done")
        return updated(flow);
      return updated({
        ...flow,
        status: { kind: "failed", failure: action.failure },
      });
    default:
      return updated(flow);
  }
}

function canChange(flow: MailedLinkFlow): boolean {
  return flow.status.kind === "idle" || flow.status.kind === "failed";
}

function submitted(flow: MailedLinkFlow, server: ServerState) {
  const serverUrl = mailedLinkServerUrlOf(flow, server);
  if (serverUrl === null || !canSubmitMailedLink(flow, server))
    return updated(flow);
  const sending = { ...flow, status: { kind: "sending" } } as const;
  const { token, password } = flow;
  return flow.kind === "confirmEmail"
    ? updated(sending, { type: "confirmEmail", serverUrl, token })
    : updated(sending, { type: "setNewPassword", serverUrl, token, password });
}

function confirmationAnswered(
  flow: MailedLinkFlow | null,
  { outcome }: Extract<AppAction, { type: "emailConfirmationAnswered" }>,
  server: ServerState,
) {
  if (flow?.kind !== "confirmEmail" || flow.status.kind !== "sending")
    return updated(flow);
  if (!outcome.ok)
    return updated({
      ...flow,
      status: { kind: "failed", failure: outcome.error },
    });
  const done = { ...flow, status: { kind: "done" } } as const;
  // The Account page of a connected app shows whether the address is confirmed.
  return server.config === null
    ? updated(done)
    : updated(done, principalRefresh(accountViaOf(server.config)));
}

function newPasswordAnswered(
  flow: MailedLinkFlow | null,
  { serverUrl, outcome }: Extract<AppAction, { type: "newPasswordAnswered" }>,
) {
  if (flow?.kind !== "resetPassword" || flow.status.kind !== "sending")
    return updated(flow);
  if (!outcome.ok)
    return updated({
      ...flow,
      status: { kind: "failed", failure: outcome.error },
    });
  return updated(
    { ...flow, password: "", status: { kind: "done" } },
    {
      type: "connectToServer",
      server: { serverUrl, token: outcome.data.token },
    },
  );
}
