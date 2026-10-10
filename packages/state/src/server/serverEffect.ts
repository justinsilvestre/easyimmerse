import type { ServerRequest } from "./serverRequest.ts";

/**
 * Sends or aborts a server request. A request settles as one `requestSettled` action with the same id.
 * Sending an id that is in flight aborts the earlier request, and only the later one settles.
 * Requests with the same scope are sent one at a time, in the order they were asked for.
 */
export type ServerEffect =
  | { type: "sendRequest"; id: string; request: ServerRequest; scope?: string }
  | { type: "abortRequest"; id: string }
  /**
   * Settles as aborted a request that was aborted while it waited for its scope, and so was never sent.
   * The root update returns it in place of that abort; features never return it.
   */
  | { type: "settleWithdrawnRequest"; id: string; request: ServerRequest };
