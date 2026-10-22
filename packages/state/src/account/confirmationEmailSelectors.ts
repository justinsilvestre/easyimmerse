import type { AppRoot } from "../app/createAppStore.ts";
import { selectIsRequestInFlight } from "../operations/operationsSelectors.ts";
import { confirmationEmailRequestId } from "./confirmationEmail.ts";
import { signInFailureMessage } from "./signInFailureMessage.ts";

/** Tells whether the app is asking the server to mail another confirmation link. */
export const selectIsSendingConfirmationEmail = (state: AppRoot) =>
  selectIsRequestInFlight(state.app, confirmationEmailRequestId);

/** Tells what came of the last request for another confirmation link, or returns null before any. */
export function selectConfirmationEmailMessage(
  state: AppRoot,
): { tone: "success" | "danger"; text: string } | null {
  const status = state.app.account.confirmationEmail;
  switch (status.kind) {
    case "idle":
      return null;
    case "sent":
      return { tone: "success", text: "We sent a new link." };
    case "tooSoon":
      return { tone: "danger", text: waitMessage(status.retryAfterSeconds) };
    case "failed":
      return {
        tone: "danger",
        text: signInFailureMessage(
          status.failure,
          state.app.server.config?.serverUrl ?? "that address",
          "send the link",
        ),
      };
  }
}

function waitMessage(retryAfterSeconds: number | undefined): string {
  if (retryAfterSeconds === undefined)
    return "Wait a minute before asking again.";
  const seconds = Math.max(1, retryAfterSeconds);
  return `Wait ${seconds} ${seconds === 1 ? "second" : "seconds"} before asking again.`;
}
