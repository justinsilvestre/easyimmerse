/** Whether a backend error means that no server is configured, as opposed to a server that failed. */
export function isOfflineError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === "OFFLINE"
  );
}
