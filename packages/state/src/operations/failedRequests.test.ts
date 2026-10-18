import { describe, expect, it } from "vitest";
import { abortedFailure } from "../server/serverRequest.ts";
import { type FailedRequest, trackFailedRequests } from "./failedRequests.ts";

const failed = (id: string): FailedRequest => ({
  id,
  request: { kind: "listMediaFiles", projectId: "p1" },
  failure: abortedFailure,
});

const keep = (kept: FailedRequest) =>
  ({ type: "keepFailedRequest", failed: kept }) as const;

describe("trackFailedRequests", () => {
  it("keeps a failed request", () => {
    const [kept] = trackFailedRequests([], [keep(failed("a"))]);
    expect(kept).toEqual([failed("a")]);
  });

  it("keeps a failed request in place of one with its id", () => {
    const again = { ...failed("a"), failure: { status: 500, message: "" } };
    const [kept] = trackFailedRequests(
      [failed("a"), failed("b")],
      [keep(again)],
    );
    expect(kept).toEqual([again, failed("b")]);
  });

  it("forgets a failed request", () => {
    const [kept] = trackFailedRequests(
      [failed("a"), failed("b")],
      [{ type: "forgetFailedRequest", id: "a" }],
    );
    expect(kept).toEqual([failed("b")]);
  });

  it("keeps the same list when it forgets nothing", () => {
    const failedRequests = [failed("a")];
    const [kept] = trackFailedRequests(failedRequests, [
      { type: "forgetFailedRequest", id: "b" },
    ]);
    expect(kept).toBe(failedRequests);
  });

  it("passes the other effects on", () => {
    const [, others] = trackFailedRequests(
      [],
      [keep(failed("a")), { type: "abortRequest", id: "x" }],
    );
    expect(others).toEqual([{ type: "abortRequest", id: "x" }]);
  });
});
