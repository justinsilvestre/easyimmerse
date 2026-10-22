import type { Effects, RequestFailure } from "@easyimmerse/state";
import { pairingCodeOf } from "@easyimmerse/state";
import type { ServerAuthInfo } from "@easyimmerse/types";
import { fetchAuthInfoAt } from "./fetchAuthInfoAt.ts";
import { keepServerInStorage } from "./keepServerInStorage.ts";

/**
 * The parts of the page's location that finding the serving server reads,
 * the fragment it clears once it has read a pairing code, and the way to load another address.
 */
export type ServedLocation = Pick<
  Location,
  "origin" | "hash" | "pathname" | "search" | "replace"
>;

/** The platform's requests that finding the serving server sends. */
export type ServedServerEffects = Pick<
  Effects,
  "claimPairingCode" | "fetchServerAuthInfo"
>;

/**
 * What the web app learned about the server that serves it.
 * It paired and is loading again; it found a pairing code while it already has a server, so the person decides;
 * pairing failed; the server answered what it offers for signing in; or nothing.
 */
export type ServedServerOutcome =
  | { kind: "reloading" }
  | { kind: "pairingOffered"; serverUrl: string; code: string }
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
 * A pairing URL's fragment, `#pair=<code>`, is claimed at the page's origin when the app has no server yet.
 * The token is then kept as the app's server, and the page loads again without the fragment.
 * When the app already has a server, the code is only offered, so that pairing never replaces that server unasked.
 * Without a code, an app that has no server asks the origin what it offers for signing in.
 */
export async function resolveServedServer(
  location: ServedLocation,
  effects: ServedServerEffects,
  storage: Storage | null,
  hasServer: boolean,
): Promise<ServedServerOutcome> {
  const serverUrl = location.origin;
  const code = pairingCodeOf(location.hash);
  if (code !== null && hasServer) {
    location.hash = "";
    return { kind: "pairingOffered", serverUrl, code };
  }
  if (code !== null)
    return claimPairingCodeAt(location, effects, storage, code);
  if (hasServer) return { kind: "none" };
  const info = await fetchAuthInfoAt(effects, serverUrl);
  return info === null
    ? { kind: "none" }
    : { kind: "serverFound", serverUrl, info };
}

/** Claims the code at the page's origin, keeps the server it leads to, and loads the page again without the fragment. */
async function claimPairingCodeAt(
  location: ServedLocation,
  effects: ServedServerEffects,
  storage: Storage | null,
  code: string,
): Promise<ServedServerOutcome> {
  const serverUrl = location.origin;
  const claim = await effects.claimPairingCode(serverUrl, code);
  const failure = claim.ok
    ? keepServerInStorage(storage, { serverUrl, token: claim.data.token })
    : claim.error;
  if (failure === null) {
    location.replace(`${serverUrl}${location.pathname}${location.search}`);
    return { kind: "reloading" };
  }
  location.hash = "";
  return { kind: "pairingFailed", serverUrl, code, failure };
}
