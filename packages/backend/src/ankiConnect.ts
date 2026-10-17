import { ankiConnectActions } from "./ankiConnectActions.ts";
import { AnkiConnectError, lostConnectionOf } from "./ankiConnectError.ts";

/** Where AnkiConnect listens while Anki runs. */
export const ankiConnectUrl = "http://127.0.0.1:8765";

/** One AnkiConnect action with its parameters, as version 6 of the add-on's API takes it. */
export type AnkiConnectRequest = {
  action: string;
  version: 6;
  params: Record<string, unknown>;
};

/** Sends actions to AnkiConnect. */
export type AnkiConnect = {
  /**
   * Sends one action and resolves its result, or rejects with an `AnkiConnectError`.
   * The first action asks Anki for permission first, since Anki answers only the pages it allows.
   * A granted permission is kept until Anki stops answering or refuses this page, since the user may have withdrawn it by then.
   */
  invoke<T>(request: AnkiConnectRequest): Promise<T>;
};

/**
 * Builds an AnkiConnect client over the given fetch, for a page of the given origin.
 * The origin is the one the page's fetch sends and AnkiConnect allows or refuses, and is null outside a page.
 */
export function createAnkiConnect(
  fetchFn: typeof fetch = (input, init) => globalThis.fetch(input, init),
  origin: string | null = globalThis.location?.origin ?? null,
): AnkiConnect {
  const post = <T>(request: AnkiConnectRequest) =>
    postAction<T>(fetchFn, request, origin);
  let permission: Promise<void> | null = null;
  const askPermissionOnce = () => {
    permission ??= askPermission(post, origin).catch((error: unknown) => {
      permission = null;
      throw error;
    });
    return permission;
  };
  return {
    invoke: async <T>(request: AnkiConnectRequest) => {
      await askPermissionOnce();
      return post<T>(request).catch((error: unknown) => {
        if (lostConnectionOf(error) !== null) permission = null;
        throw error;
      });
    },
  };
}

type Post = <T>(request: AnkiConnectRequest) => Promise<T>;

/** Asks Anki to allow this page. Anki shows its question only to a page it does not allow yet. */
async function askPermission(post: Post, origin: string | null): Promise<void> {
  const answer = await post<{ permission?: string }>(
    ankiConnectActions.requestPermission(),
  );
  if (answer.permission !== "granted")
    throw new AnkiConnectError({ kind: "denied", origin });
}

/**
 * Posts an action. The body goes without a JSON content type, so that the browser sends it without a preflight request.
 * Anki refuses a page it does not allow with 403.
 */
async function postAction<T>(
  fetchFn: typeof fetch,
  request: AnkiConnectRequest,
  origin: string | null,
): Promise<T> {
  const response = await fetchFn(ankiConnectUrl, {
    method: "POST",
    body: JSON.stringify(request),
  }).catch(() => {
    throw new AnkiConnectError({ kind: "unreachable" });
  });
  if (response.status === 403)
    throw new AnkiConnectError({ kind: "denied", origin });
  if (!response.ok)
    throw failure(`Anki answered with the status ${response.status}.`);
  return ankiResultOf<T>(await response.json().catch(() => null));
}

/** Reads the result of an answer `{ result, error }`, or throws its error. */
export function ankiResultOf<T>(answer: unknown): T {
  if (typeof answer !== "object" || answer === null || !("result" in answer))
    throw failure("Anki gave an answer that easyImmerse could not read.");
  const { result, error } = answer as { result: T; error?: unknown };
  if (typeof error === "string") throw failure(error);
  return result;
}

function failure(message: string) {
  return new AnkiConnectError({ kind: "failed", message });
}
