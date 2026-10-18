import { afterEach, describe, expect, it, vi } from "vitest";
import { createFlashcardId } from "./createFlashcardId.ts";

describe("createFlashcardId", () => {
  afterEach(() => vi.restoreAllMocks());

  it("makes 32 lowercase hexadecimal digits", () => {
    vi.spyOn(crypto, "randomUUID").mockImplementation(() => {
      throw new Error("crypto.randomUUID needs a secure context");
    });
    expect(createFlashcardId()).toMatch(/^[0-9a-f]{32}$/);
  });
});
