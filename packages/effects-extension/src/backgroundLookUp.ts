import type { BackendResult } from "@easyimmerse/backend";
import type { LookupQuery, LookupResponse } from "@easyimmerse/types";
import type { LookUpTextMessage } from "./lookUpTextMessage.ts";

/**
 * Builds a lookup that a content script sends to the background script over `sendMessage`,
 * since a request from the page itself would be subject to the page's CORS and mixed-content rules.
 */
export function createBackgroundLookUp(
  sendMessage: (message: LookUpTextMessage) => Promise<unknown>,
) {
  return async (query: LookupQuery): Promise<BackendResult<LookupResponse>> => {
    try {
      const answer = await sendMessage({ kind: "lookUpText", query });
      return (answer as BackendResult<LookupResponse> | undefined) ?? noAnswer;
    } catch (cause) {
      return { error: { status: "NETWORK", message: String(cause) } };
    }
  };
}

const noAnswer: BackendResult<LookupResponse> = {
  error: {
    status: "NETWORK",
    message: "The background script did not answer.",
  },
};
