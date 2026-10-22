import type { RequestFailure } from "../server/serverRequest.ts";
import type { ServerState } from "../server/serverState.ts";
import type { MailedLink } from "./readMailedLink.ts";
import { isHttpUrl } from "./signInForm.ts";

/** How far following a mailed link has gone: waiting for the person, sent to the server, done, or failed. */
export type MailedLinkStatus =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done" }
  | { kind: "failed"; failure: RequestFailure };

/**
 * A mailed link the app was opened with, and what the person typed to follow it:
 * the address of the server that sent it, when the app knows of none, and the new password a reset link lets them choose.
 */
export type MailedLinkFlow = MailedLink & {
  serverAddress: string;
  password: string;
  status: MailedLinkStatus;
};

/** The fields of the flow that a person edits. */
export type MailedLinkFields = Pick<
  MailedLinkFlow,
  "serverAddress" | "password"
>;

/** The flow of a link the app was just opened with. */
export function startMailedLinkFlow(link: MailedLink): MailedLinkFlow {
  return { ...link, serverAddress: "", password: "", status: { kind: "idle" } };
}

/** Whether the app knows of no server that may have sent a link, so that the person must type its address. */
export function needsServerAddress(server: ServerState): boolean {
  return server.config === null && server.cloudUrl === null;
}

/**
 * The server a mailed link is followed on: the one the app is connected to, else the official server,
 * else the one whose address the person typed, or null when that is not an HTTP or HTTPS address.
 */
export function mailedLinkServerUrlOf(
  flow: MailedLinkFlow,
  server: ServerState,
): string | null {
  const known = server.config?.serverUrl ?? server.cloudUrl;
  if (known !== null) return known;
  const typed = flow.serverAddress.trim();
  return isHttpUrl(typed) ? typed : null;
}

/** Whether the link can be followed now: it waits for nothing, names a server, and has a new password when it resets one. */
export function canSubmitMailedLink(
  flow: MailedLinkFlow,
  server: ServerState,
): boolean {
  return (
    (flow.status.kind === "idle" || flow.status.kind === "failed") &&
    mailedLinkServerUrlOf(flow, server) !== null &&
    (flow.kind === "confirmEmail" || flow.password !== "")
  );
}
