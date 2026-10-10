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
      const entry = pending.find(
        (other) => canonicalJson(other.request) === canonicalJson(request),
      );
      if (!settle(entry, outcome))
        throw new Error(
          `No request equal to ${canonicalJson(request)} is pending. ${describePending(pending)}`,
        );
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

/** Writes a request as JSON with every object's keys sorted, so that equal requests give equal text. */
function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, inner: unknown) =>
    typeof inner === "object" && inner !== null && !Array.isArray(inner)
      ? Object.fromEntries(
          Object.entries(inner).sort(([left], [right]) =>
            left < right ? -1 : 1,
          ),
        )
      : inner,
  );
}

function describePending(pending: readonly Pending[]): string {
  return pending.length === 0
    ? "No request is pending."
    : `Pending: ${pending.map(({ request }) => canonicalJson(request)).join(", ")}.`;
}
