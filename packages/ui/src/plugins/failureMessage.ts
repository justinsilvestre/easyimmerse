import type { BackendError } from "@easyimmerse/backend";

/** The message of a failed request, or `fallback` when the failure carries none. */
export function failureMessage(failure: unknown, fallback: string): string {
  const message = (failure as Partial<BackendError> | null)?.message;
  return message || fallback;
}
