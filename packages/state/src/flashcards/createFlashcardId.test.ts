import { describe, expect, it } from "vitest";
import { createFlashcardId } from "./createFlashcardId.ts";

describe("createFlashcardId", () => {
  it("makes 32 lowercase hexadecimal digits", () => {
    expect(createFlashcardId()).toMatch(/^[0-9a-f]{32}$/);
  });

  it("makes a different id each time", () => {
    expect(createFlashcardId()).not.toBe(createFlashcardId());
  });
});
