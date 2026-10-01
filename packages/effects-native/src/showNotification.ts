/**
 * Builds a notification effect that tries the operating system first and falls back to
 * `fallback` when the notification cannot be shown.
 */
export function createShowNotification(
  sendOsNotification: (message: string) => Promise<boolean>,
  fallback: (message: string) => void,
): (message: string) => void {
  return (message) => {
    sendOsNotification(message)
      .then((sent) => sent || fallback(message))
      .catch(() => fallback(message));
  };
}
