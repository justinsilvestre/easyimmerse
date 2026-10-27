import { describe, expect, it } from "vitest";
import { apiPathOf } from "./apiPathOf.ts";

describe("apiPathOf", () => {
  it("puts the route under the API path prefix", () => {
    expect(apiPathOf("/projects/p1?x=1")).toBe("/api/projects/p1?x=1");
  });
});
