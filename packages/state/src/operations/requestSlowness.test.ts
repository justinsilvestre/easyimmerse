import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { initialAppState } from "../app/update.ts";
import type { ServerRequest } from "../server/serverRequest.ts";
import type { RequestRecord } from "./operations.ts";
import { operationsFeature } from "./operations.ts";
import { trackRequests } from "./trackRequests.ts";

const request: ServerRequest = { kind: "listMediaFiles", projectId: "p1" };
const slowable: RequestRecord = {
  id: "a",
  request,
  isWaiting: false,
  slowAfterMs: 2000,
};

const operationsWith = (...requests: RequestRecord[]) => ({
  requests,
  failedRequests: [],
  jobs: {},
});

describe("request slowness", () => {
  it("starts a request's slowness timer when it is sent", () => {
    const [, effects] = trackRequests(operationsWith(), [
      { type: "sendRequest", id: "a", request, slowAfterMs: 2000 },
    ]);
    expect(effects).toContainEqual({
      type: "startTimer",
      id: "requests/slow/a",
      ms: 2000,
      action: actions.requestWentSlow("a"),
    });
  });

  it("records how long a request may wait before it counts as slow", () => {
    const [next] = trackRequests(operationsWith(), [
      { type: "sendRequest", id: "a", request, slowAfterMs: 2000 },
    ]);
    expect(next.requests[0]?.slowAfterMs).toBe(2000);
  });

  it("marks a request as slow once its timer runs out", () => {
    const [next] = operationsFeature.update(
      operationsWith(slowable),
      actions.requestWentSlow("a"),
      initialAppState,
    );
    expect(next.requests[0]?.isSlow).toBe(true);
  });

  it("cancels the slowness timer of a request that settles", () => {
    const [, effects] = operationsFeature.update(
      operationsWith(slowable),
      actions.requestSettled("a", request, {
        ok: true,
        data: { media_files: [] },
      }),
      initialAppState,
    );
    expect(effects).toContainEqual({
      type: "cancelTimer",
      id: "requests/slow/a",
    });
  });

  it("keeps the operations as they are when the slow request has settled", () => {
    const operations = operationsWith();
    const [next] = operationsFeature.update(
      operations,
      actions.requestWentSlow("a"),
      initialAppState,
    );
    expect(next).toBe(operations);
  });
});
