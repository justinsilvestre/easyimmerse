/** Returns the message of a failed backend request, whether the backend client or RTK Query produced the error. */
export function describeBackendError(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error)
    return String(error.message);
  return "The request failed.";
}
