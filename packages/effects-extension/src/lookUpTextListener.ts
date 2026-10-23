import {
  createHttpBackendClient,
  lookupTextRequest,
} from "@easyimmerse/backend";
import type { ServerConfig } from "@easyimmerse/state";
import type { LookupResponse } from "@easyimmerse/types";
import { isLookUpTextMessage } from "./lookUpTextMessage.ts";
import { createServerMessageListener } from "./serverMessageListener.ts";

/** Builds the background script's listener that answers each lookup message with the response of the server that `resolveServer` names. */
export function createLookUpTextListener(
  resolveServer: () => Promise<ServerConfig | null>,
  fetchFn?: typeof fetch,
) {
  return createServerMessageListener(
    isLookUpTextMessage,
    ({ query }, server) =>
      createHttpBackendClient({
        ...server,
        fetch: fetchFn,
      }).send<LookupResponse>(lookupTextRequest(query)),
    resolveServer,
  );
}
