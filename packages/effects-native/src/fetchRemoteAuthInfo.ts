import { buildAuthorizationHeader } from "@easyimmerse/backend";
import { requestJson } from "@easyimmerse/effects-web";
import type { Effects, RequestFailure, ServerConfig } from "@easyimmerse/state";

type FetchServerAuthInfo = Effects["fetchServerAuthInfo"];

/** What a server offers for signing in, as the effect resolves with it. */
type ServerAuthInfo = Extract<
  Awaited<ReturnType<FetchServerAuthInfo>>,
  { ok: true }
>["data"];

/**
 * Builds the effect that asks a remote what it offers for signing in, through the built-in server,
 * which reaches the remote without the web view's limits on requests to other origins.
 * The built-in server answers 502 when the remote could not be reached or gave an answer it could not read,
 * which resolves as the failures the browser's own request would give.
 */
export function createRemoteAuthInfoFetch(
  server: ServerConfig,
  fetchFn: typeof fetch = globalThis.fetch,
): FetchServerAuthInfo {
  return async (serverUrl) => {
    const url = new URL("/sync/remote-auth-info", server.serverUrl);
    url.searchParams.set("server_url", serverUrl);
    const outcome = await requestJson<ServerAuthInfo>(fetchFn, url, {
      headers: { authorization: buildAuthorizationHeader(server) },
    });
    if (outcome.ok || outcome.error.status !== 502) return outcome;
    return { ok: false, error: remoteFailureOf(outcome.error) };
  };
}

function remoteFailureOf(failure: RequestFailure): RequestFailure {
  return failure.code === "remote_failed"
    ? { status: "NO_DATA", message: failure.message }
    : { status: "NETWORK", message: failure.message };
}
