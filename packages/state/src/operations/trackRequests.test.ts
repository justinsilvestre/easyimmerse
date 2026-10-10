import { describe, expect, it } from "vitest";
import type { Effect } from "../app/effect.ts";
import type { ServerRequest } from "../server/serverRequest.ts";
import type { OperationsState, RequestRecord } from "./operations.ts";
import { trackRequests } from "./trackRequests.ts";

const first: ServerRequest = { kind: "listMediaFiles", projectId: "p1" };
const second: ServerRequest = { kind: "listMediaFiles", projectId: "p2" };

function sent(id: string, request: ServerRequest, scope?: string) {
  return { id, request, scope, isWaiting: false } satisfies RequestRecord;
}

function waiting(id: string, request: ServerRequest, scope: string) {
  return { id, request, scope, isWaiting: true } satisfies RequestRecord;
}

function send(id: string, request: ServerRequest, scope?: string): Effect {
  return scope === undefined
    ? { type: "sendRequest", id, request }
    : { type: "sendRequest", id, request, scope };
}

function operationsWith(...requests: RequestRecord[]): OperationsState {
  return { requests };
}

describe("trackRequests", () => {
  describe("when a request without a scope is sent", () => {
    it("performs the send", () => {
      const [, effects] = trackRequests(operationsWith(), [send("a", first)]);
      expect(effects).toEqual([send("a", first)]);
    });

    it("records the request as sent", () => {
      const [operations] = trackRequests(operationsWith(), [send("a", first)]);
      expect(operations.requests).toEqual([
        { id: "a", request: first, isWaiting: false },
      ]);
    });
  });

  describe("when a scoped request is sent", () => {
    it("sends it at once when its scope is idle", () => {
      const [, effects] = trackRequests(operationsWith(), [
        send("a", first, "s"),
      ]);
      expect(effects).toEqual([send("a", first, "s")]);
    });

    it("holds it back while its scope has a request in flight", () => {
      const [, effects] = trackRequests(operationsWith(sent("a", first, "s")), [
        send("b", second, "s"),
      ]);
      expect(effects).toEqual([]);
    });

    it("records a held request as waiting after the requests asked for before it", () => {
      const [operations] = trackRequests(
        operationsWith(sent("a", first, "s")),
        [send("b", second, "s")],
      );
      expect(operations.requests).toEqual([
        sent("a", first, "s"),
        waiting("b", second, "s"),
      ]);
    });

    it("sends requests of different scopes together", () => {
      const [, effects] = trackRequests(operationsWith(), [
        send("a", first, "s"),
        send("b", second, "t"),
      ]);
      expect(effects).toEqual([send("a", first, "s"), send("b", second, "t")]);
    });

    it("replaces a waiting request with the same id in its place", () => {
      const [operations] = trackRequests(
        operationsWith(
          sent("a", first, "s"),
          waiting("b", first, "s"),
          waiting("c", first, "s"),
        ),
        [send("b", second, "s")],
      );
      expect(operations.requests.map(({ id }) => id)).toEqual(["a", "b", "c"]);
    });

    it("sends a new version of the request in flight with the same id at once", () => {
      const [, effects] = trackRequests(operationsWith(sent("a", first, "s")), [
        send("a", second, "s"),
      ]);
      expect(effects).toEqual([send("a", second, "s")]);
    });
  });

  describe("when no request of a scope is in flight", () => {
    it("sends only the first waiting request of the scope", () => {
      const [, effects] = trackRequests(
        operationsWith(waiting("b", first, "s"), waiting("c", second, "s")),
        [],
      );
      expect(effects).toEqual([send("b", first, "s")]);
    });

    it("records the request it sends as sent", () => {
      const [operations] = trackRequests(
        operationsWith(waiting("b", first, "s"), waiting("c", second, "s")),
        [],
      );
      expect(operations.requests).toEqual([
        sent("b", first, "s"),
        waiting("c", second, "s"),
      ]);
    });
  });

  describe("when a request is aborted", () => {
    it("settles a waiting request as withdrawn instead of aborting it", () => {
      const [, effects] = trackRequests(
        operationsWith(sent("a", first, "s"), waiting("b", second, "s")),
        [{ type: "abortRequest", id: "b" }],
      );
      expect(effects).toEqual([
        { type: "settleWithdrawnRequest", id: "b", request: second },
      ]);
    });

    it("forgets a waiting request", () => {
      const [operations] = trackRequests(
        operationsWith(sent("a", first, "s"), waiting("b", second, "s")),
        [{ type: "abortRequest", id: "b" }],
      );
      expect(operations.requests).toEqual([sent("a", first, "s")]);
    });

    it("performs the abort of a request in flight", () => {
      const [, effects] = trackRequests(operationsWith(sent("a", first)), [
        { type: "abortRequest", id: "a" },
      ]);
      expect(effects).toEqual([{ type: "abortRequest", id: "a" }]);
    });
  });

  it("passes other effects through", () => {
    const notice: Effect = { type: "showNotification", message: "Saved" };
    const [, effects] = trackRequests(operationsWith(), [notice]);
    expect(effects).toEqual([notice]);
  });

  it("keeps the operations as they are when no effect concerns a request", () => {
    const operations = operationsWith(sent("a", first, "s"));
    const [next] = trackRequests(operations, [
      { type: "showNotification", message: "Saved" },
    ]);
    expect(next).toBe(operations);
  });
});
