import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import { initialAppState, update } from "../app/update.ts";
import type { ServerRequest } from "../server/serverRequest.ts";
import type { RequestRecord } from "./operations.ts";
import { trackRequests } from "./trackRequests.ts";

const first: ServerRequest = { kind: "listMediaFiles", projectId: "p1" };
const second: ServerRequest = { kind: "listMediaFiles", projectId: "p2" };

const limitOfB: Effect = {
  type: "startTimer",
  id: "requests/limit/b",
  ms: 30_000,
  action: actions.requestTimeLimitPassed("b"),
};

function withRequests(...requests: RequestRecord[]) {
  return {
    ...initialAppState,
    operations: { requests, failedRequests: [], jobs: {} },
  };
}

const firstInFlight: RequestRecord = {
  id: "a",
  request: first,
  scope: "s",
  isWaiting: false,
};
const secondWaiting: RequestRecord = {
  id: "b",
  request: second,
  scope: "s",
  isWaiting: true,
  timeLimitMs: 30_000,
};
const secondInFlight: RequestRecord = { ...secondWaiting, isWaiting: false };

describe("operations", () => {
  it("starts a request's time limit when it is sent, not while it waits", () => {
    const [, effects] = update(
      withRequests(firstInFlight, secondWaiting),
      actions.requestSettled("a", first, {
        ok: true,
        data: { media_files: [] },
      }),
    );
    expect(effects).toContainEqual(limitOfB);
  });

  it("starts no time limit for a request that waits behind another", () => {
    const [, effects] = trackRequests(withRequests(firstInFlight).operations, [
      {
        type: "sendRequest",
        id: "b",
        request: second,
        scope: "s",
        timeLimitMs: 30_000,
      },
    ]);
    expect(effects).toEqual([]);
  });

  it("aborts a request once its time limit passes", () => {
    const [, effects] = update(
      withRequests(secondInFlight),
      actions.requestTimeLimitPassed("b"),
    );
    expect(effects).toEqual([{ type: "abortRequest", id: "b" }]);
  });

  it("aborts nothing once the request has settled", () => {
    const [, effects] = update(
      withRequests(),
      actions.requestTimeLimitPassed("b"),
    );
    expect(effects).toEqual([]);
  });

  it("cancels a request's time limit once it settles", () => {
    const [, effects] = update(
      withRequests(secondInFlight),
      actions.requestSettled("b", second, {
        ok: true,
        data: { media_files: [] },
      }),
    );
    expect(effects).toEqual([{ type: "cancelTimer", id: "requests/limit/b" }]);
  });
});
