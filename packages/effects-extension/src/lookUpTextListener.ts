import {
  type BackendResult,
  createHttpBackendClient,
  lookupTextRequest,
} from "@easyimmerse/backend";
import type { ServerConfig } from "@easyimmerse/state";
import type { LookupQuery, LookupResponse } from "@easyimmerse/types";
import { isLookUpTextMessage } from "./lookUpTextMessage.ts";

type LookUpTextAnswer = BackendResult<LookupResponse>;

const notConnected: LookUpTextAnswer = {
  error: {
    status: "OFFLINE",
    message: "The extension is not connected to a server.",
  },
};

/**
 * Builds the background script's message listener that answers each lookup message with the response of the server
 * that `resolveServer` names. It returns true for a lookup message, which keeps the channel open for the answer,
 * and false for any other message, which it leaves to other listeners.
 */
export function createLookUpTextListener(
  resolveServer: () => Promise<ServerConfig | null>,
  fetchFn?: typeof fetch,
) {
  return (
    message: unknown,
    _sender: unknown,
    sendResponse: (answer: LookUpTextAnswer) => void,
  ): boolean => {
    if (!isLookUpTextMessage(message)) return false;
    void lookUpText(message.query, resolveServer, fetchFn).then(sendResponse);
    return true;
  };
}

async function lookUpText(
  query: LookupQuery,
  resolveServer: () => Promise<ServerConfig | null>,
  fetchFn: typeof fetch | undefined,
): Promise<LookUpTextAnswer> {
  const server = await resolveServer();
  if (server === null) return notConnected;
  const client = createHttpBackendClient({ ...server, fetch: fetchFn });
  return client.send<LookupResponse>(lookupTextRequest(query));
}
