import type { RequestFailure, ServerConfig } from "@easyimmerse/state";
import {
  connectionNotKeptCode,
  serverConfigStorageKey,
} from "@easyimmerse/state";

/** Keeps the server in the storage the app reads its server from when it starts, or returns why it could not. */
export function keepServerInStorage(
  storage: Storage | null,
  server: ServerConfig,
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
