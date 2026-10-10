import { describe, expect, it } from "vitest";
import type { PerformedEffect } from "../app/effect.ts";
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

function send(
  id: string,
  request: ServerRequest,
  scope?: string,
): PerformedEffect {
  return { type: "sendRequest", id, request, scope };
}

function operationsWith(...requests: RequestRecord[]): OperationsState {
  return { requests, jobs: {}, lookupFlashcardsStarted: 0 };
}

describe("trackRequests", () => {
  describe("when a scoped request is sent", () => {
    it("sends it at once when its scope is idle", () => {
      const [, effects] = trackRequests(operationsWith(), [
        send("a", first, "s"),
      ]);
      expect(effects).toEqual([send("a", first, "s")]);
    });

    it("sends the first of two requests sent together to an idle scope and holds back the second", () => {
      const [, effects] = trackRequests(operationsWith(), [
        send("a", first, "s"),
        send("b", second, "s"),
      ]);
      expect(effects).toEqual([send("a", first, "s")]);
    });

    it("sends requests of different scopes together", () => {
      const [, effects] = trackRequests(operationsWith(), [
        send("a", first, "s"),
        send("b", second, "t"),
      ]);
      expect(effects).toEqual([send("a", first, "s"), send("b", second, "t")]);
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
    it("sends only the last version of a request sent, aborted and sent again to an idle scope", () => {
      const [, effects] = trackRequests(operationsWith(), [
        send("b", first, "s"),
        { type: "abortRequest", id: "b" },
        send("b", second, "s"),
      ]);
      expect(effects).toEqual([send("b", second, "s")]);
    });
  });

  it("keeps the operations as they are when no effect concerns a request", () => {
    const operations = operationsWith(sent("a", first, "s"));
    const [next] = trackRequests(operations, [
      { type: "showNotification", message: "Saved" },
    ]);
    expect(next).toBe(operations);
  });
});
