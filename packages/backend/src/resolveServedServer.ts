import type { AppAction, RequestFailure } from "@easyimmerse/state";
import {
  actions,
  connectionNotKeptCode,
  pairingCodeOf,
  serverConfigStorageKey,
} from "@easyimmerse/state";
import type { PairingGrant, ServerAuthInfo } from "@easyimmerse/types";

/** The parts of the page's location that finding the serving server reads, and the way to load another address. */
export type ServedLocation = Pick<
  Location,
  "origin" | "hash" | "pathname" | "search" | "replace"
>;

/**
 * What the web app learned about the server that serves it: that it paired and is loading again,
 * that pairing failed, that the server answered what it offers for signing in, or nothing.
 */
export type ServedServerOutcome =
  | { kind: "reloading" }
  | {
      kind: "pairingFailed";
      serverUrl: string;
      code: string;
      failure: RequestFailure;
    }
  | { kind: "serverFound"; serverUrl: string; info: ServerAuthInfo }
  | { kind: "none" };

/**
 * Finds the easyImmerse server that serves the web app, before the store is built.
 * A pairing URL's fragment, `#pair=<code>`, is claimed at the page's origin; the token is kept as the app's server,
 * and the page loads again without the fragment. Otherwise, when the app has no server, the origin is asked what it offers for signing in.
 */
export async function resolveServedServer(
  location: ServedLocation,
  fetchFn: typeof fetch,
  storage: Storage | null,
  hasServer: boolean,
): Promise<ServedServerOutcome> {
  const serverUrl = location.origin;
  const code = pairingCodeOf(location.hash);
  if (code !== null) {
    const claim = await claimAt(fetchFn, serverUrl, code);
    if (!claim.ok)
      return { kind: "pairingFailed", serverUrl, code, failure: claim.error };
    const kept = keep(storage, { serverUrl, token: claim.data.token });
    if (kept !== null)
      return { kind: "pairingFailed", serverUrl, code, failure: kept };
    location.replace(`${serverUrl}${location.pathname}${location.search}`);
    return { kind: "reloading" };
  }
  if (hasServer) return { kind: "none" };
  const info = await authInfoAt(fetchFn, serverUrl);
  return info === null
    ? { kind: "none" }
    : { kind: "serverFound", serverUrl, info };
}

/**
 * The actions that show what the web app learned about its server, once the store exists:
 * a failed pairing opens the pairing page with its message, a server with accounts fills in the sign-in form,
 * and a server without accounts fills in the pairing form's address.
 */
export function servedServerActions(outcome: ServedServerOutcome): AppAction[] {
  switch (outcome.kind) {
    case "pairingFailed":
      return [
        actions.pairingFormChanged({
          address: outcome.serverUrl,
          code: outcome.code,
        }),
        actions.pairingFailed(outcome.failure),
        actions.navigated({ type: "openPairing" }),
      ];
    case "serverFound":
      return outcome.info.accounts
        ? [
            actions.signInFormChanged({
              serverChoice: "own",
              ownServerUrl: outcome.serverUrl,
            }),
          ]
        : [actions.pairingFormChanged({ address: outcome.serverUrl })];
    default:
      return [];
  }
}

type Claim =
  | { ok: true; data: PairingGrant }
  | { ok: false; error: RequestFailure };

async function claimAt(
  fetchFn: typeof fetch,
  serverUrl: string,
  code: string,
): Promise<Claim> {
  let response: Response;
  try {
    response = await fetchFn(new URL("/pairing/claim", serverUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
  } catch (cause) {
    return { ok: false, error: { status: "NETWORK", message: String(cause) } };
  }
  const body: unknown = await response.json().catch(() => null);
  if (response.ok && hasString(body, "token"))
    return { ok: true, data: { token: body.token } };
  return { ok: false, error: failureOf(response, body) };
}

/** The server's `ServerAuthInfo`, or null when the origin answers something else, as a static host does. */
async function authInfoAt(
  fetchFn: typeof fetch,
  serverUrl: string,
): Promise<ServerAuthInfo | null> {
  try {
    const response = await fetchFn(new URL("/auth/server", serverUrl));
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return isServerAuthInfo(body) ? body : null;
  } catch {
    return null;
  }
}

/** Keeps the server in the storage, or returns why it could not. */
function keep(
  storage: Storage | null,
  server: { serverUrl: string; token: string },
): RequestFailure | null {
  try {
    if (storage === null) throw new Error("This browser keeps no storage.");
    storage.setItem(serverConfigStorageKey, JSON.stringify(server));
    return null;
  } catch (cause) {
    return {
      status: "NO_DATA",
      code: connectionNotKeptCode,
      message: String(cause),
    };
  }
}

function failureOf(response: Response, body: unknown): RequestFailure {
  const retryAfter = response.headers.get("retry-after")?.trim() ?? "";
  const waiting = /^\d+$/.test(retryAfter)
    ? { retryAfterSeconds: Number(retryAfter) }
    : {};
  if (!response.ok && hasString(body, "code") && hasString(body, "message"))
    return {
      status: response.status,
      code: body.code,
      message: body.message,
      ...waiting,
    };
  return {
    status: response.ok ? "NO_DATA" : response.status,
    message: response.statusText,
    ...waiting,
  };
}

function hasString<K extends string>(
  value: unknown,
  key: K,
): value is Record<K, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>)[key] === "string"
  );
}

function isServerAuthInfo(value: unknown): value is ServerAuthInfo {
  if (typeof value !== "object" || value === null) return false;
  const { accounts, open_signup } = value as Partial<ServerAuthInfo>;
  return typeof accounts === "boolean" && typeof open_signup === "boolean";
}
