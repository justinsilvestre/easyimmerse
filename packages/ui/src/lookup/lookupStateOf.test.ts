import { describe, expect, it } from "vitest";
import { exampleResults } from "./exampleLookup.ts";
import { lookupStateOf } from "./lookupStateOf.ts";

const emptyResponse = { results: [], kanji: [], stylesheets: [] };

describe("lookupStateOf", () => {
  it("shows the term as loading while the request is pending", () => {
    expect(lookupStateOf("fressen", { kind: "pending" })).toEqual({
      kind: "loading",
      term: "fressen",
    });
  });

  it("says nothing was found for an empty answer", () => {
    expect(
      lookupStateOf("Hundi", { kind: "answered", response: emptyResponse }),
    ).toEqual({ kind: "notFound", term: "Hundi" });
  });

  it("shows the results of an answer", () => {
    expect(
      lookupStateOf("fressen", {
        kind: "answered",
        response: { ...emptyResponse, results: [...exampleResults] },
      }),
    ).toEqual({
      kind: "found",
      term: "fressen",
      results: exampleResults,
      kanji: [],
      stylesheets: [],
    });
  });

  it("says when the request failed", () => {
    expect(lookupStateOf("fressen", { kind: "failed" })).toEqual({
      kind: "failed",
      term: "fressen",
    });
  });
});
