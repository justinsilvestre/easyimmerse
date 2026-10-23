import type { BackendResult } from "@easyimmerse/backend";
import type { LookupQuery, LookupResponse } from "@easyimmerse/types";
import { createBackgroundRequest } from "./backgroundRequest.ts";
import type { LookUpTextMessage } from "./lookUpTextMessage.ts";

/**
 * Builds a lookup that a content script sends to the background script over `sendMessage`,
 * since a request from the page itself would be subject to the page's CORS and mixed-content rules.
 */
export function createBackgroundLookUp(
  sendMessage: (message: LookUpTextMessage) => Promise<unknown>,
) {
  const request = createBackgroundRequest<LookUpTextMessage, LookupResponse>(
    sendMessage,
  );
  return (query: LookupQuery): Promise<BackendResult<LookupResponse>> =>
    request({ kind: "lookUpText", query });
}
