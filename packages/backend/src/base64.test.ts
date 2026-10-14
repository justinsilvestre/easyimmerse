import { describe, expect, it } from "vitest";
import { bytesToBase64 } from "./base64.ts";

describe("bytesToBase64", () => {
  it("encodes bytes", () => {
    expect(bytesToBase64(new Uint8Array([0, 255, 104, 105]))).toBe("AP9oaQ==");
  });

  it("encodes more bytes than one chunk holds", () => {
    const bytes = new Uint8Array(100_000).fill(65);
    expect(atob(bytesToBase64(bytes))).toBe("A".repeat(100_000));
  });
});
