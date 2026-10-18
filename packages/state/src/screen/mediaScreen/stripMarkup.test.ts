import { describe, expect, it } from "vitest";
import { stripMarkup } from "./stripMarkup.ts";

describe("stripMarkup", () => {
  it("removes subtitle tags", () => {
    expect(stripMarkup("<i>Everything</i> is quiet.")).toBe(
      "Everything is quiet.",
    );
  });
});
