import type {
  Effects,
  RequestFailure,
  ServerConfig,
  SignInAttempt,
  SignInOutcome,
} from "@easyimmerse/state";
import {
  apiPathOf,
  connectionNotKeptCode,
  serverConfigStorageKey,
} from "@easyimmerse/state";
import type { ApiError } from "@easyimmerse/types";

/**
 * The effects through which a person signs in to a server and connects the app to it, or disconnects it,
 * and follows the links a server mails to confirm an email address or to choose a new password.
 */
export type AccountEffects = Pick<
  Effects,
  | "fetchServerAuthInfo"
  | "createSession"
  | "connectToServer"
  | "disconnectFromServer"
  | "confirmEmail"
  | "requestPasswordReset"
  | "setNewPassword"
>;

/**
 * Builds the account effects over the given fetch, the storage the app reads its server from when it starts, and a function that reloads the page.
 * Connecting keeps the server and token in the storage, and disconnecting removes them; either then reloads the page, which starts the app anew.
 * A connection the storage refuses, as a full, private or blocked one may, resolves as a failure and reloads nothing.
 */
export function createAccountEffects(
  fetchFn: typeof fetch,
  storage: Storage | null,
  reload: () => void,
): AccountEffects {
  return {
    fetchServerAuthInfo: (serverUrl) =>
      requestJson(fetchFn, new URL(apiPathOf("/auth/server"), serverUrl)),
    createSession: ({ serverUrl, mode, email, password }: SignInAttempt) =>
      requestJson(
        fetchFn,
        new URL(apiPathOf(`/auth/${mode}`), serverUrl),
        postingJson({ email, password }),
      ),
    confirmEmail: (serverUrl, token) =>
      requestDone(
        fetchFn,
        new URL(apiPathOf("/auth/confirm-email"), serverUrl),
        postingJson({ token }),
      ),
    requestPasswordReset: (serverUrl, email) =>
      requestDone(
        fetchFn,
        new URL(apiPathOf("/auth/password-reset"), serverUrl),
        postingJson({ email }),
      ),
    setNewPassword: (serverUrl, token, password) =>
      requestJson(
        fetchFn,
        new URL(apiPathOf("/auth/password"), serverUrl),
        postingJson({ token, password }),
      ),
    connectToServer: async (server: ServerConfig) => {
      try {
        if (storage === null) throw new Error("This browser keeps no storage.");
        storage.setItem(serverConfigStorageKey, JSON.stringify(server));
      } catch (cause) {
        return { ok: false, error: connectionNotKept(cause) };
      }
      reload();
      return { ok: true, data: null };
    },
    disconnectFromServer: () => {
      storage?.removeItem(serverConfigStorageKey);
      reload();
    },
  };
}

function postingJson(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

/** Sends a request whose success carries no data, and resolves with null or the reason it failed. */
async function requestDone(
  fetchFn: typeof fetch,
  url: URL,
  init: RequestInit,
): Promise<SignInOutcome<null>> {
  const sent = await send(fetchFn, url, init);
  if (!sent.ok) return sent;
  return { ok: true, data: null };
}

/** Sends a request and resolves with the response when it succeeds, or the reason it failed. */
async function send(
  fetchFn: typeof fetch,
  url: URL,
  init?: RequestInit,
): Promise<SignInOutcome<Response>> {
  let response: Response;
  try {
    response = await fetchFn(url, init);
  } catch (cause) {
    return {
      ok: false,
      error: { status: "NETWORK", message: describe(cause) },
    };
  }
  if (!response.ok) return { ok: false, error: await failureOf(response) };
  return { ok: true, data: response };
}

/** Sends a request and reads its JSON answer, or the reason there is none: the server's API error, an unreachable server, or an unreadable answer. */
export async function requestJson<T>(
  fetchFn: typeof fetch,
  url: URL,
  init?: RequestInit,
): Promise<SignInOutcome<T>> {
  const sent = await send(fetchFn, url, init);
  if (!sent.ok) return sent;
  const response = sent.data;
  try {
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, error: unreadableAnswer };
  }
}

const unreadableAnswer: RequestFailure = {
  status: "NO_DATA",
  message: "The server's answer could not be read.",
};

/**
 * Reads the API error a failed response holds, or keeps its status alone when its body is not one,
 * along with the seconds its `Retry-After` header asks to wait, when it gives them.
 */
async function failureOf(response: Response): Promise<RequestFailure> {
  const retryAfterSeconds = retryAfterSecondsOf(response.headers);
  const waiting = retryAfterSeconds === null ? {} : { retryAfterSeconds };
  const body: unknown = await response.json().catch(() => null);
  if (!isApiError(body))
    return {
      status: response.status,
      message: response.statusText,
      ...waiting,
    };
  return {
    status: response.status,
    code: body.code,
    message: body.message,
    ...waiting,
  };
}

function isApiError(value: unknown): value is ApiError {
  if (typeof value !== "object" || value === null) return false;
  const { code, message } = value as Partial<Record<keyof ApiError, unknown>>;
  return typeof code === "string" && typeof message === "string";
}

function connectionNotKept(cause: unknown): RequestFailure {
  return {
    status: "NO_DATA",
    code: connectionNotKeptCode,
    message: describe(cause),
  };
}

/** The seconds a `Retry-After` header asks to wait, or null when it names a date or is absent. */
function retryAfterSecondsOf(headers: Headers): number | null {
  const value = headers.get("retry-after")?.trim() ?? "";
  return /^\d+$/.test(value) ? Number(value) : null;
}

function describe(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
