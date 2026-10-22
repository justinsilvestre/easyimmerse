import type { AppAction } from "../app/appAction.ts";
import type { ReadableState } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { selectIsRequestInFlight } from "../operations/operationsSelectors.ts";
import { isAborted } from "../server/isAborted.ts";
import { isSettled } from "../server/isSettled.ts";
import { accountViaOf } from "../server/serverSelectors.ts";
import {
  type ConfirmationEmailStatus,
  confirmationEmailRequestId,
  principalRefresh,
} from "./confirmationEmail.ts";

/**
 * Asks the server to mail the account another link that confirms its email address, and keeps what came of it.
 * When the server says the address is confirmed already, it fetches the account anew, so that the Account section shows it.
 */
export function updateConfirmationEmail(
  status: ConfirmationEmailStatus,
  action: AppAction,
  { operations, server }: Pick<ReadableState, "operations" | "server">,
) {
  const via = accountViaOf(server.config);
  if (action.type === "confirmationEmailRequested") {
    if (selectIsRequestInFlight({ operations }, confirmationEmailRequestId))
      return updated(status);
    return updated(
      { kind: "idle" },
      {
        type: "sendRequest",
        id: confirmationEmailRequestId,
        request: { kind: "requestConfirmationEmail", via },
      },
    );
  }
  if (
    !isSettled(action, confirmationEmailRequestId, "requestConfirmationEmail")
  )
    return updated(status);
  const { outcome } = action;
  if (outcome.ok) return updated({ kind: "sent" });
  if (isAborted(outcome)) return updated(status);
  if (outcome.error.status === 429)
    return updated({
      kind: "tooSoon",
      retryAfterSeconds: outcome.error.retryAfterSeconds,
    });
  if (outcome.error.status === 409)
    return updated({ kind: "idle" }, principalRefresh(via));
  return updated({ kind: "failed", failure: outcome.error });
}
