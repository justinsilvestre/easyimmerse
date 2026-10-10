import type { Feature } from "../app/feature.ts";
import type { ServerRequest } from "../server/serverRequest.ts";

/** A request sent and not yet settled. */
export type RequestRecord = {
  id: string;
  request: ServerRequest;
  /**
   * Requests with the same scope are sent one at a time, in the order they were asked for.
   * An id keeps the scope it was first sent with: while it is recorded, a resend's scope is ignored.
   */
  scope?: string;
  /** True while the request waits for an earlier request of its scope to settle. */
  isWaiting: boolean;
};

/** Work under way that any feature may ask about. */
export type OperationsState = {
  /** Every request sent and not yet settled, in the order they were asked for. */
  requests: readonly RequestRecord[];
};

/** The operations as a feature. It forgets a request once it settles; the root update records the requests sent. */
export const operationsFeature: Feature<OperationsState> = {
  initialState: { requests: [] },
  update: (operations, action) => {
    if (action.type !== "requestSettled") return [operations, []];
    const requests = operations.requests.filter(({ id }) => id !== action.id);
    return requests.length === operations.requests.length
      ? [operations, []]
      : [{ requests }, []];
  },
};
