import { describe, expect, it } from "vitest";
import { lookupTextAt } from "./lookupTextAt.ts";

describe("lookupTextAt", () => {
  it("looks up the text from the clicked word onwards", () => {
    expect(lookupTextAt("Ich rufe dich an.", 4).text).toBe("rufe dich an.");
  });

  it("counts the offset in characters after a character outside the Basic Multilingual Plane", () => {
    expect(lookupTextAt("😀 Ich rufe an", 3).offset).toBe(2);
  });
});
