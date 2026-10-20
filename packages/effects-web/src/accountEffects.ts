import type {
  Effects,
  RequestFailure,
  ServerConfig,
  SignInAttempt,
  SignInOutcome,
} from "@easyimmerse/state";
import { serverConfigStorageKey } from "@easyimmerse/state";

/** The effects through which a person signs in to a server and connects the app to it, or disconnects it. */
export type AccountEffects = Pick<
  Effects,
  | "fetchServerAuthInfo"
  | "createSession"
  | "connectToServer"
  | "disconnectFromServer"
>;

/**
 * Builds the account effects over the given fetch, the storage the app reads its server from when it starts, and a function that reloads the page.
 * Connecting keeps the server and token in the storage, and disconnecting removes them; either then reloads the page, which starts the app anew.
 */
export function createAccountEffects(
  fetchFn: typeof fetch,
  storage: Storage,
  reload: () => void,
): AccountEffects {
  return {
    fetchServerAuthInfo: (serverUrl) =>
      requestJson(fetchFn, new URL("/auth/server", serverUrl)),
    createSession: ({ serverUrl, mode, email, password }: SignInAttempt) =>
      requestJson(fetchFn, new URL(`/auth/${mode}`, serverUrl), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      }),
    connectToServer: (server: ServerConfig) => {
      storage.setItem(serverConfigStorageKey, JSON.stringify(server));
      reload();
    },
    disconnectFromServer: () => {
      storage.removeItem(serverConfigStorageKey);
      reload();
    },
  };
}

/** Sends a request and reads its JSON answer, or the reason there is none. */
async function requestJson<T>(
  fetchFn: typeof fetch,
  url: URL,
  init?: RequestInit,
): Promise<SignInOutcome<T>> {
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

/** Reads the API error a failed response holds, or keeps its status alone when its body is not one. */
async function failureOf(response: Response): Promise<RequestFailure> {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body !== "object" || body === null || !("code" in body))
    return { status: response.status, message: response.statusText };
  const { code, message } = body as { code: unknown; message?: unknown };
  return {
    status: response.status,
    code: String(code),
    message: typeof message === "string" ? message : response.statusText,
  };
}

function describe(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
