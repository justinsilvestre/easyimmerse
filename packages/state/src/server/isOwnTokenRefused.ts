import type { RequestFailure } from "./serverRequest.ts";

/**
 * The codes of a 401 that the built-in server passes on from the remote it is linked to:
 * the remote refused the email and password, or the session the built-in server keeps there.
 * Neither says anything of the token the app itself sends.
 */
const remoteRefusalCodes: ReadonlySet<string> = new Set([
  "invalid_credentials",
  "remote_logged_out",
]);

/** Tells whether the server refused the token the app itself sends, as opposed to credentials or a session on a remote. */
export function isOwnTokenRefused(
  failure: Pick<RequestFailure, "status" | "code">,
): boolean {
  return (
    failure.status === 401 &&
    (failure.code === undefined || !remoteRefusalCodes.has(failure.code))
  );
}
