import { describe, expect, it } from "vitest";
import type { ServerRequest } from "../server/serverRequest.ts";
import { assignFreeRequestIds } from "./freeIdRequests.ts";

const listing: ServerRequest = { kind: "listMediaFiles", projectId: "p1" };

const under = (prefix: string) =>
  ({ type: "sendRequestWithFreeId", prefix, request: listing }) as const;

describe("assignFreeRequestIds", () => {
  it("sends a request under the first id free below its prefix", () => {
    expect(assignFreeRequestIds([], [under("hover")])).toEqual([
      { type: "sendRequest", id: "hover/1", request: listing },
    ]);
  });

  it("skips an id a recorded request holds", () => {
    const recorded = { id: "hover/1", request: listing, isWaiting: false };
    const [send] = assignFreeRequestIds([recorded], [under("hover")]);
    expect(send).toMatchObject({ id: "hover/2" });
  });

  it("gives two requests sent under one prefix different ids", () => {
    const sends = assignFreeRequestIds([], [under("hover"), under("hover")]);
    expect(sends.map((effect) => "id" in effect && effect.id)).toEqual([
      "hover/1",
      "hover/2",
    ]);
  });
});
