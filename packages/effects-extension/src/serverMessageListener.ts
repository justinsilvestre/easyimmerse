import type { BackendResult } from "@easyimmerse/backend";
import type { ServerConfig } from "@easyimmerse/state";

const notConnected: BackendResult<never> = {
  error: {
    status: "OFFLINE",
    message: "The extension is not connected to a server.",
  },
};

/**
 * Builds a background script's message listener that answers each message `isMessage` accepts by asking the server `resolveServer` names,
 * or that no server is connected. It returns true for such a message, which keeps the channel open for the answer,
 * and false for any other message, which it leaves to other listeners.
 */
export function createServerMessageListener<Message, Answer>(
  isMessage: (message: unknown) => message is Message,
  answer: (
    message: Message,
    server: ServerConfig,
  ) => Promise<BackendResult<Answer>>,
  resolveServer: () => Promise<ServerConfig | null>,
) {
  return (
    message: unknown,
    _sender: unknown,
    sendResponse: (answer: BackendResult<Answer>) => void,
  ): boolean => {
    if (!isMessage(message)) return false;
    void answerWithServer(message, answer, resolveServer).then(sendResponse);
    return true;
  };
}

async function answerWithServer<Message, Answer>(
  message: Message,
  answer: (
    message: Message,
    server: ServerConfig,
  ) => Promise<BackendResult<Answer>>,
  resolveServer: () => Promise<ServerConfig | null>,
): Promise<BackendResult<Answer>> {
  const server = await resolveServer();
  return server === null ? notConnected : answer(message, server);
}
