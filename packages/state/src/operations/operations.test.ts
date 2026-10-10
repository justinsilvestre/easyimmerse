import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { initialAppState } from "../app/update.ts";
import type { ServerRequest } from "../server/serverRequest.ts";
import { operationsFeature } from "./operations.ts";

const first: ServerRequest = { kind: "listMediaFiles", projectId: "p1" };
const second: ServerRequest = { kind: "listMediaFiles", projectId: "p2" };

const settledFirst = actions.requestSettled("a", first, {
  ok: true,
  data: { media_files: [] },
});

describe("operationsFeature", () => {
  it("forgets a request once it settles", () => {
    const operations = {
      requests: [
        { id: "a", request: first, isWaiting: false },
        { id: "b", request: second, isWaiting: false },
      ],
    };
    const [next] = operationsFeature.update(
      operations,
      settledFirst,
      initialAppState,
    );
    expect(next.requests.map(({ id }) => id)).toEqual(["b"]);
  });

  it("keeps the operations as they are when the settled request is not recorded", () => {
    const operations = { requests: [] };
    const [next] = operationsFeature.update(
      operations,
      settledFirst,
      initialAppState,
    );
    expect(next).toBe(operations);
  });
});
