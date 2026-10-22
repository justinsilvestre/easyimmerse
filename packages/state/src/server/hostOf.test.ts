import { describe, expect, it } from "vitest";
import { hostOf } from "./hostOf.ts";

describe("hostOf", () => {
  it("returns the host and port of a URL", () => {
    expect(hostOf("http://192.168.1.4:4000/path?q=1")).toBe("192.168.1.4:4000");
  });

  it("returns an address that is not a URL as it is", () => {
    expect(hostOf("my server")).toBe("my server");
  });
});
