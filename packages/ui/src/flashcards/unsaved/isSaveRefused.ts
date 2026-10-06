/**
 * The client errors that sending again may cure: missing or expired credentials (401), a denial that may be lifted (403),
 * a request the server gave up waiting for (408), and too many requests (429).
 */
const passingStatuses: ReadonlySet<number> = new Set([401, 403, 408, 429]);

/**
 * Tells whether the server refused a save, so that sending it again cannot succeed,
 * unlike a lost connection, a timeout, a server error, or a client error that may pass.
 */
export function isSaveRefused(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return (
    typeof status === "number" &&
    status >= 400 &&
    status < 500 &&
    !passingStatuses.has(status)
  );
}
