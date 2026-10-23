import type { BackendResult } from "@easyimmerse/backend";

/**
 * Builds a request that a content script sends to the background script over `sendMessage`,
 * which answers with a failure when the message cannot be sent or no listener answers it.
 */
export function createBackgroundRequest<Message, Answer>(
  sendMessage: (message: Message) => Promise<unknown>,
) {
  return async (message: Message): Promise<BackendResult<Answer>> => {
    try {
      const answer = await sendMessage(message);
      return (answer as BackendResult<Answer> | undefined) ?? noAnswer;
    } catch (cause) {
      return { error: { status: "NETWORK", message: String(cause) } };
    }
  };
}

const noAnswer: BackendResult<never> = {
  error: {
    status: "NETWORK",
    message: "The background script did not answer.",
  },
};
