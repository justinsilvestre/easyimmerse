import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { initialAppState } from "../app/update.ts";
import { cat, requestFlashcard } from "../screen/lookup/lookupTestSupport.ts";
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
      jobs: {},
      lookupRequestsSent: 0,
    };
    const [next] = operationsFeature.update(
      operations,
      settledFirst,
      initialAppState,
    );
    expect(next.requests.map(({ id }) => id)).toEqual(["b"]);
  });

  it("keeps the operations as they are when the settled request is not recorded", () => {
    const operations = { requests: [], jobs: {}, lookupRequestsSent: 0 };
    const [next] = operationsFeature.update(
      operations,
      settledFirst,
      initialAppState,
    );
    expect(next).toBe(operations);
  });

  it("counts the hovers, which number their lookups' requests", () => {
    const [next] = operationsFeature.update(
      operationsFeature.initialState,
      actions.lookupWordHovered(cat),
      initialAppState,
    );
    expect(next.lookupRequestsSent).toBe(1);
  });

  it("counts the flashcards started from words, which number their lookups' requests", () => {
    const [next] = operationsFeature.update(
      operationsFeature.initialState,
      requestFlashcard(cat),
      initialAppState,
    );
    expect(next.lookupRequestsSent).toBe(1);
  });
});
