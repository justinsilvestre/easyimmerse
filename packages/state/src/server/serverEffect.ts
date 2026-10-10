import type { ServerRequest } from "./serverRequest.ts";

/**
 * Sends or aborts a server request. A request settles as one `requestSettled` action with the same id.
 * Sending an id that is in flight aborts the earlier request, and only the later one settles.
 * Requests with the same scope are sent one at a time, in the order they were asked for.
 * A request with a time limit is aborted once it has gone that long without settling, counted from when it is sent rather than from when it was asked for.
 * A request held for another is recorded but not sent, and keeps later requests of its scope waiting, until its id is sent again without `heldFor`.
 */
export type ServerEffect =
  | {
      type: "sendRequest";
      id: string;
      request: ServerRequest;
      scope?: string;
      timeLimitMs?: number;
      /** The id of the request this one is held for, as a save waits for the lookup that fills its card. */
      heldFor?: string;
    }
  | { type: "abortRequest"; id: string }
  /**
   * Settles as aborted a request that was aborted while it waited for its scope, and so was never sent.
   * The root update returns it in place of that abort; features never return it.
   */
  | { type: "settleWithdrawnRequest"; id: string; request: ServerRequest };
