import { describe, expect, it } from "vitest";
import { hostOf } from "./hostOf.ts";

describe("hostOf", () => {
  it("returns the host of a URL with its port", () => {
    expect(hostOf("https://books.example.org:8443/path")).toBe(
      "books.example.org:8443",
    );
  });

  it("returns an address that is not a URL as it is", () => {
    expect(hostOf("books")).toBe("books");
  });
});
