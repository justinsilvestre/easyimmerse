import type {
  RequestOutcome,
  RunningRequest,
  ServerRequest,
} from "./serverRequest.ts";

/** The requests a store has sent that have not settled, by id. */
export type RequestTable = {
  /**
   * Sends a request and calls `settle` with its outcome once it ends.
   * A request in flight with the same id is aborted, and its outcome is never passed on.
   */
  send(
    id: string,
    request: ServerRequest,
    settle: (outcome: RequestOutcome) => void,
  ): void;
  /** Aborts the request in flight with this id, which then settles as aborted. Does nothing when there is none. */
  abort(id: string): void;
};

/** Creates an empty request table that sends each request through the given function. */
export function createRequestTable(
  send: (request: ServerRequest) => RunningRequest,
): RequestTable {
  const running = new Map<string, RunningRequest>();
  return {
    send: (id, request, settle) => {
      running.get(id)?.abort();
      const started = send(request);
      running.set(id, started);
      started.settled.then((outcome) => {
        if (running.get(id) !== started) return;
        running.delete(id);
        settle(outcome);
      });
    },
    abort: (id) => running.get(id)?.abort(),
  };
}
