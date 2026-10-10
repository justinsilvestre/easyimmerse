import { describe, expect, it } from "vitest";
import { cacheKey } from "./cacheKey.ts";

describe("cacheKey", () => {
  it("gives equal keys for arguments whose keys come in another order", () => {
    expect(
      cacheKey("getMediaTracks", { projectId: "p1", mediaFileId: "m1" }),
    ).toBe(cacheKey("getMediaTracks", { mediaFileId: "m1", projectId: "p1" }));
  });

  it("sorts the keys of nested objects", () => {
    expect(cacheKey("q", { outer: { b: 1, a: 2 } })).toBe(
      'q({"outer":{"a":2,"b":1}})',
    );
  });

  it("keeps the order of arrays", () => {
    expect(cacheKey("q", [2, 1])).toBe("q([2,1])");
  });

  it("writes missing arguments as undefined", () => {
    expect(cacheKey("q", undefined)).toBe("q(undefined)");
  });
});
