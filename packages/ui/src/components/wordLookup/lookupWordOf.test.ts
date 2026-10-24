import { describe, expect, it } from "vitest";
import { lookupWordOf } from "./lookupWordOf.ts";

const text = {
  text: "Katze schläft.",
  context: "Die Katze schläft.",
  offset: 4,
};

describe("lookupWordOf", () => {
  it("looks a word up with its context", () => {
    expect(lookupWordOf("Katze", text, "de", true)).toEqual({
      term: "Katze",
      query: {
        text: "Katze schläft.",
        language: "de",
        context: "Die Katze schläft.",
        offset: 4,
      },
    });
  });

  it("looks nothing up in a language no dictionary covers", () => {
    expect(lookupWordOf("Katze", text, "de", false).query).toBeNull();
  });
});
