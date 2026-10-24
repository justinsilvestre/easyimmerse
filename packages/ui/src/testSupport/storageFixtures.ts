import type { ServerConfig } from "@easyimmerse/state";
import type { StorageStatus, StoredCopy } from "@easyimmerse/types";
import {
  createFakeBackendClient,
  type FakeResponse,
} from "./createFakeBackendClient.ts";
import { fixtureResponses } from "./fixtureResponses.ts";

const gigabyte = 1_000_000_000;

/** A server the web app is connected to with an account's session. */
export const accountServer: ServerConfig = {
  serverUrl: "https://media.example.org",
  token: "session-token",
};

/** Two copies the server keeps, largest first. */
export const fixtureStoredCopies: StoredCopy[] = [
  {
    media_file_id: "m1",
    project_id: "p1",
    project_name: "Spanish practice",
    name: "episode.mkv",
    size_bytes: 1.6 * gigabyte,
    stored_at_ms: 0,
  },
  {
    media_file_id: "m2",
    project_id: "p1",
    project_name: "Spanish practice",
    name: "interview.mp3",
    size_bytes: 4_820_133,
    stored_at_ms: 0,
  },
];

/** The storage status of a server that keeps the copies within the quota, or without one when it is null. */
export const fixtureStorageStatus = (
  copies: StoredCopy[],
  quotaBytes: number | null = 10 * gigabyte,
): StorageStatus => ({
  quota_bytes: quotaBytes,
  used_bytes: copies.reduce((sum, copy) => sum + copy.size_bytes, 0),
  copies,
});

/** A fake server the app is connected to as an account, which reports the storage status given and gives the other answers given. */
export function createAccountServerClient(
  storage: FakeResponse,
  answers: Record<string, FakeResponse> = {},
) {
  return createFakeBackendClient({
    ...fixtureResponses,
    "GET /auth/me": {
      kind: "account",
      user: {
        id: "u1",
        email: "someone@example.org",
        role: "library_user",
        created_at_ms: 0,
        email_confirmed_at_ms: 0,
        manages_library: false,
      },
    },
    "GET /storage": storage,
    ...answers,
  });
}
