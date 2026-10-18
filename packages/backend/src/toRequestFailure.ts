import type { RequestFailure } from "@easyimmerse/state";
import { abortedFailure } from "@easyimmerse/state";
import type { BackendError } from "./backendClient.ts";

/**
 * Turns what an endpoint's `unwrap` rejects with into a request failure:
 * the client's own error as it is, an abort as aborted, and anything else as a network failure.
 */
export function toRequestFailure(error: unknown): RequestFailure {
  if (isBackendError(error)) return error;
  if (isAbortError(error)) return abortedFailure;
  return { status: "NETWORK", message: messageOf(error) };
}

function isBackendError(error: unknown): error is BackendError {
  if (typeof error !== "object" || error === null) return false;
  const { status, message } = error as Partial<BackendError>;
  const isStatus =
    typeof status === "number" || status === "OFFLINE" || status === "NETWORK";
  return isStatus && typeof message === "string";
}

// RTK Query rejects an aborted request with a serialized error named AbortError.
function isAbortError(error: unknown): boolean {
  return (error as { name?: unknown } | null)?.name === "AbortError";
}

function messageOf(error: unknown): string {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" ? message : "The request failed.";
}
