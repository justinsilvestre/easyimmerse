import { describe, expect, it } from "vitest";
import { libraryLookupResponse } from "./libraryLookupResponse.ts";

const hunde = {
  start: 4,
  end: 9,
  entry: {
    term: "Hund",
    reading: null,
    l1_definition: "dog",
    l2_definition: "ein Haustier",
  },
};

const lookup = (word = hunde) =>
  libraryLookupResponse(word, "Die Hunde bellen.", "Im Park");

describe("libraryLookupResponse", () => {
  it("gives one result", () => {
    expect(lookup().results).toHaveLength(1);
  });

  it("matches the word as it stands in the segment's text", () => {
    expect(lookup().results[0]?.matchedText).toBe("Hunde");
  });

  it("takes the term from the entry", () => {
    expect(lookup().results[0]?.term).toBe("Hund");
  });

  it("titles the definitions by the item", () => {
    expect(lookup().results[0]?.definitions[0]?.dictionaryTitle).toBe(
      "Im Park",
    );
  });

  it("gives the entry's definitions as text", () => {
    expect(lookup().results[0]?.definitions[0]?.entry.definitions).toEqual([
      { kind: "text", text: "dog" },
      { kind: "text", text: "ein Haustier" },
    ]);
  });

  it("leaves out an empty definition", () => {
    const entry = { ...hunde.entry, l2_definition: "" };
    expect(
      lookup({ ...hunde, entry }).results[0]?.definitions[0]?.entry.definitions,
    ).toEqual([{ kind: "text", text: "dog" }]);
  });
});
