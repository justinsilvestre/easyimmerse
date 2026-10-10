import type { Action } from "redux";
import type {
  RequestOutcome,
  RequestRunner,
  RunningRequest,
  ServerRequest,
} from "../server/serverRequest.ts";
import { abortedFailure } from "../server/serverRequest.ts";
import type { ServerConfig } from "../server/serverState.ts";
import type { ServerStoreParts } from "./createAppStore.ts";

/** Server store parts for tests, which record what passes through them and settle requests only when a test says so. */
export type FakeServerStoreParts = ServerStoreParts & {
  /** Every action dispatched through the server middleware, in order. */
  dispatchedActions: Action[];
  /** Every request sent, in the order sent. */
  sentRequests: ServerRequest[];
  /** Settles the earliest pending request equal to `request` with the given outcome. Throws when none is pending. */
  respond<R extends ServerRequest>(
    request: R,
    outcome: RequestOutcome<R["kind"]>,
  ): void;
};

type FakeServerState = { mounted: true };

type Pending = {
  request: ServerRequest;
  settle(outcome: RequestOutcome): void;
};

/**
 * Builds trivial server store parts for tests, for the given server if any.
 * A request stays pending until the test responds to it, and settles as aborted as soon as it is aborted.
 */
export function createFakeServerStoreParts(
  serverConfig: ServerConfig | null = null,
): FakeServerStoreParts {
  const dispatchedActions: Action[] = [];
  const sentRequests: ServerRequest[] = [];
  let pending: readonly Pending[] = [];
  const settle = (entry: Pending | undefined, outcome: RequestOutcome) => {
    if (!entry || !pending.includes(entry)) return false;
    pending = pending.filter((other) => other !== entry);
    entry.settle(outcome);
    return true;
  };
  const runRequest = (request: ServerRequest): RunningRequest => {
    sentRequests.push(request);
    const { entry, settled } = startPending(request);
    pending = [...pending, entry];
    return { settled, abort: () => settle(entry, abortedOutcome) };
  };
  return {
    dispatchedActions,
    sentRequests,
    reducerPath: "fakeServer",
    reducer: (state: FakeServerState = { mounted: true }) => state,
    middleware: () => (next) => (action) => {
      dispatchedActions.push(action as Action);
      return next(action);
    },
    runRequest: runRequest as RequestRunner,
    respond: (request, outcome) => {
      const entry = pending.find((other) =>
        isSameRequest(other.request, request),
      );
      if (!settle(entry, outcome))
        throw new Error(`No ${request.kind} request like this one is pending.`);
    },
    serverConfig,
  };
}

const abortedOutcome: RequestOutcome = { ok: false, error: abortedFailure };

function startPending(request: ServerRequest) {
  let resolve: (outcome: RequestOutcome) => void = () => {};
  const settled = new Promise<RequestOutcome>((settle) => {
    resolve = settle;
  });
  return { entry: { request, settle: resolve }, settled };
}

// Requests are plain data, so their JSON forms are equal when the requests are, given the same key order.
function isSameRequest(left: ServerRequest, right: ServerRequest): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
