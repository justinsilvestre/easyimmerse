/** Tells whether a backend request failed because no server is configured. */
export function isOfflineError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === "OFFLINE"
  );
}
