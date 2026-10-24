import type { NativePlatform, ServerConfig } from "@easyimmerse/state";
import type { SyncLink } from "@easyimmerse/types";
import {
  createFakeBackendClient,
  type FakeResponse,
} from "./createFakeBackendClient.ts";
import { fixtureResponses, fixtureSyncStatus } from "./fixtureResponses.ts";

/** The configuration of the native app's built-in server, on the given platform. */
export const builtInServerOn = (platform: NativePlatform): ServerConfig => ({
  serverUrl: "http://127.0.0.1:4000",
  token: "launch-token",
  bundledIn: platform,
});

/**
 * Builds a fake built-in server that reports the given link to a remote, or none,
 * and answers for the remote's account through its proxy as that link's account, logged in on this device alone.
 * The other answers given replace these.
 */
export function createBuiltInServerClient(
  link: SyncLink | null,
  answers: Record<string, FakeResponse> = {},
) {
  return createFakeBackendClient({
    ...fixtureResponses,
    "GET /sync/status": fixtureSyncStatus(link),
    ...(link && remoteAccountResponses(link)),
    ...answers,
  });
}

function remoteAccountResponses(link: SyncLink) {
  const user = {
    id: "u1",
    email: link.account_email,
    role: link.account_role,
    created_at_ms: 0,
    email_confirmed_at_ms: null,
    manages_library: false,
  };
  return {
    "GET /sync/remote/auth/me": { kind: "account", user },
    "GET /sync/remote/auth/server": {
      accounts: true,
      open_signup: true,
      sends_email: false,
    },
    "GET /sync/remote/auth/sessions": {
      sessions: [
        {
          id: "s1",
          created_at_ms: Date.now(),
          last_used_at_ms: Date.now(),
          user_agent: "easyImmerse/0.1.0 (macos)",
          is_current: true,
        },
      ],
    },
    "GET /sync/remote/users": { users: [user], total: 1 },
  };
}
