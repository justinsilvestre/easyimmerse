import { describe, expect, it } from "vitest";
import { newAndChangedPhrase } from "./newAndChangedPhrase.ts";

describe("newAndChangedPhrase", () => {
  it("counts the new and the changed flashcards", () => {
    expect(newAndChangedPhrase(3, 1)).toBe("3 new and 1 changed flashcards");
  });

  it("leaves out a count of zero", () => {
    expect(newAndChangedPhrase(0, 2)).toBe("2 changed flashcards");
  });

  it("names a single flashcard in the singular", () => {
    expect(newAndChangedPhrase(1, 0)).toBe("1 new flashcard");
  });
});
