import type { Effects } from "@easyimmerse/state";
import type { ServerAuthInfo } from "@easyimmerse/types";

/** Asks the server at the address what it offers for signing in, or returns null when it answers something else, as a static host does. */
export async function fetchAuthInfoAt(
  effects: Pick<Effects, "fetchServerAuthInfo">,
  serverUrl: string,
): Promise<ServerAuthInfo | null> {
  const outcome = await effects.fetchServerAuthInfo(serverUrl);
  return outcome.ok && isServerAuthInfo(outcome.data) ? outcome.data : null;
}

function isServerAuthInfo(value: unknown): value is ServerAuthInfo {
  if (typeof value !== "object" || value === null) return false;
  const { accounts, open_signup } = value as Partial<ServerAuthInfo>;
  return typeof accounts === "boolean" && typeof open_signup === "boolean";
}
