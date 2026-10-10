import { describe, expect, it } from "vitest";
import type { PerformedEffect } from "../app/effect.ts";
import type { ServerRequest } from "../server/serverRequest.ts";
import type { RequestRecord } from "./operations.ts";
import { recordRequestEffects } from "./recordRequestEffects.ts";

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

function requestsOf(...requests: RequestRecord[]): readonly RequestRecord[] {
  return requests;
}

describe("recordRequestEffects", () => {
  it("performs the send of a request without a scope", () => {
    const [, effects] = recordRequestEffects(requestsOf(), [send("a", first)]);
    expect(effects).toEqual([send("a", first)]);
  });

  it("records a request without a scope as sent", () => {
    const [requests] = recordRequestEffects(requestsOf(), [send("a", first)]);
    expect(requests).toEqual([{ id: "a", request: first, isWaiting: false }]);
  });

  it("sends a request without a scope while another one is in flight", () => {
    const [, effects] = recordRequestEffects(requestsOf(sent("a", first)), [
      send("b", second),
    ]);
    expect(effects).toEqual([send("b", second)]);
  });

  it("holds back a scoped request while its scope has a request in flight", () => {
    const [, effects] = recordRequestEffects(
      requestsOf(sent("a", first, "s")),
      [send("b", second, "s")],
    );
    expect(effects).toEqual([]);
  });

  it("records a held request as waiting after the requests asked for before it", () => {
    const [requests] = recordRequestEffects(requestsOf(sent("a", first, "s")), [
      send("b", second, "s"),
    ]);
    expect(requests).toEqual([
      sent("a", first, "s"),
      waiting("b", second, "s"),
    ]);
  });

  it("keeps the scope an id was first sent with", () => {
    const [requests] = recordRequestEffects(
      requestsOf(sent("a", first, "s"), sent("c", first, "t")),
      [send("a", second, "t")],
    );
    expect(requests).toEqual([sent("a", second, "s"), sent("c", first, "t")]);
  });

  it("replaces a waiting request with the same id in its place", () => {
    const [requests] = recordRequestEffects(
      requestsOf(
        sent("a", first, "s"),
        waiting("b", first, "s"),
        waiting("c", first, "s"),
      ),
      [send("b", second, "s")],
    );
    expect(requests).toEqual([
      sent("a", first, "s"),
      waiting("b", second, "s"),
      waiting("c", first, "s"),
    ]);
  });

  it("sends a new version of the request in flight with the same id at once", () => {
    const [, effects] = recordRequestEffects(
      requestsOf(sent("a", first, "s")),
      [send("a", second, "s")],
    );
    expect(effects).toEqual([send("a", second, "s")]);
  });

  it("settles a waiting request as withdrawn instead of aborting it", () => {
    const [, effects] = recordRequestEffects(
      requestsOf(sent("a", first, "s"), waiting("b", second, "s")),
      [{ type: "abortRequest", id: "b" }],
    );
    expect(effects).toEqual([
      { type: "settleWithdrawnRequest", id: "b", request: second },
    ]);
  });

  it("forgets a waiting request", () => {
    const [requests] = recordRequestEffects(
      requestsOf(sent("a", first, "s"), waiting("b", second, "s")),
      [{ type: "abortRequest", id: "b" }],
    );
    expect(requests).toEqual([sent("a", first, "s")]);
  });

  it("settles nothing when the waiting request's id is sent again in the same update", () => {
    const [, effects] = recordRequestEffects(
      requestsOf(sent("a", first, "s"), waiting("b", first, "s")),
      [{ type: "abortRequest", id: "b" }, send("b", second, "s")],
    );
    expect(effects).toEqual([]);
  });

  it("keeps the request sent again in the same update waiting in the aborted one's place", () => {
    const [requests] = recordRequestEffects(
      requestsOf(
        sent("a", first, "s"),
        waiting("b", first, "s"),
        waiting("c", first, "s"),
      ),
      [{ type: "abortRequest", id: "b" }, send("b", second, "s")],
    );
    expect(requests).toEqual([
      sent("a", first, "s"),
      waiting("b", second, "s"),
      waiting("c", first, "s"),
    ]);
  });

  it("performs the abort of a request in flight", () => {
    const [, effects] = recordRequestEffects(requestsOf(sent("a", first)), [
      { type: "abortRequest", id: "a" },
    ]);
    expect(effects).toEqual([{ type: "abortRequest", id: "a" }]);
  });

  it("passes other effects through", () => {
    const link: PerformedEffect = {
      type: "openExternalUrl",
      url: "https://example.com",
    };
    const [, effects] = recordRequestEffects(requestsOf(), [link]);
    expect(effects).toEqual([link]);
  });
});
