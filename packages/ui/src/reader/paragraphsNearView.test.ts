import { describe, expect, it } from "vitest";
import { paragraphsNearView } from "./paragraphsNearView.ts";

const paragraphs = [
  "a".repeat(10),
  "b".repeat(10),
  "c".repeat(10),
  "d".repeat(10),
  "e".repeat(10),
];

describe("paragraphsNearView", () => {
  it("takes the paragraphs from the first in view on for two screens, then those before it for one", () => {
    expect(paragraphsNearView(paragraphs, 2, 10).map((p) => p[0])).toEqual([
      "c",
      "d",
      "b",
    ]);
  });

  it("stops at either end of the chapter", () => {
    expect(paragraphsNearView(paragraphs, 4, 50).map((p) => p[0])).toEqual([
      "e",
      "d",
      "c",
      "b",
      "a",
    ]);
  });
});
