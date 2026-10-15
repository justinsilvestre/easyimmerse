import { type AnkiConnection, ankiUnreachableCode } from "@easyimmerse/state";
import type { BackendError } from "./backendClient.ts";

/**
 * Why an AnkiConnect action failed: Anki did not answer, it refused this page, or it answered with an error.
 * A refusal names the page's origin, as AnkiConnect lists it in its config, or null outside a page.
 */
export type AnkiConnectFailure =
  | { kind: "unreachable" }
  | { kind: "denied"; origin: string | null }
  | { kind: "failed"; message: string };

/** The error an AnkiConnect action rejects with. */
export class AnkiConnectError extends Error {
  readonly failure: AnkiConnectFailure;

  constructor(failure: AnkiConnectFailure) {
    super(failure.kind === "failed" ? failure.message : failure.kind);
    this.name = "AnkiConnectError";
    this.failure = failure;
  }
}

/** Tells whether an error is AnkiConnect's answer about one action, as opposed to Anki not answering or refusing this page. */
export function isActionFailure(error: unknown): boolean {
  return error instanceof AnkiConnectError && error.failure.kind === "failed";
}

/** Tells whether an error is Anki not answering, as when it is not running. */
export function isUnreachable(error: unknown): boolean {
  return (
    error instanceof AnkiConnectError && error.failure.kind === "unreachable"
  );
}

/** Returns the connection to Anki that an error shows, when Anki did not answer or refused this page, or null for any other error. */
export function lostConnectionOf(error: unknown): AnkiConnection | null {
  if (!(error instanceof AnkiConnectError)) return null;
  const { failure } = error;
  if (failure.kind === "unreachable")
    return { connected: false, isDenied: false };
  if (failure.kind === "denied")
    return { connected: false, isDenied: true, origin: failure.origin };
  return null;
}

/**
 * Resolves whether an action succeeded. An action Anki answered with an error resolves false,
 * while Anki not answering or refusing this page still rejects, since every later action would fail too.
 */
export function hasSucceeded(invoked: Promise<unknown>): Promise<boolean> {
  return invoked.then(() => true, recoverActionFailure(false));
}

/** Returns a rejection handler that resolves the fallback for an action Anki answered with an error, and rethrows anything else. */
export function recoverActionFailure<T>(fallback: T) {
  return (error: unknown): T => {
    if (isActionFailure(error)) return fallback;
    throw error;
  };
}

/** Turns what a send to Anki threw into the failure of its request. */
export function ankiBackendError(error: unknown): BackendError {
  if (!(error instanceof AnkiConnectError))
    return { status: "NETWORK", message: messageOf(error) };
  switch (error.failure.kind) {
    case "unreachable":
      return {
        status: "NETWORK",
        code: ankiUnreachableCode,
        message: "Anki is not running, or AnkiConnect is not installed.",
      };
    case "denied":
      return {
        status: 403,
        code: "anki_denied",
        message: "Anki did not allow easyImmerse to use AnkiConnect.",
      };
    case "failed":
      return { status: 502, code: "anki_failed", message: error.message };
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
