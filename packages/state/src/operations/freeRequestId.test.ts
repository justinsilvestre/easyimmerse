import { describe, expect, it } from "vitest";
import { freeRequestId } from "./freeRequestId.ts";
import type { RequestRecord } from "./operations.ts";

const recorded = (id: string): RequestRecord => ({
  id,
  request: { kind: "lookupText", query: { text: "cat", language: "de" } },
  isWaiting: false,
});

describe("freeRequestId", () => {
  it("numbers the first request under a prefix 1", () => {
    expect(freeRequestId("lookup/hover", [])).toBe("lookup/hover/1");
  });

  it("skips the ids of requests recorded", () => {
    const requests = [recorded("lookup/hover/1"), recorded("lookup/hover/2")];
    expect(freeRequestId("lookup/hover", requests)).toBe("lookup/hover/3");
  });

  it("takes again an id whose request has settled", () => {
    expect(freeRequestId("lookup/hover", [recorded("lookup/hover/2")])).toBe(
      "lookup/hover/1",
    );
  });
});
