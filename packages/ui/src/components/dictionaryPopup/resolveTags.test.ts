import type { TagDefinition } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { resolveTags } from "./resolveTags.ts";

function tag(name: string, order = 0): TagDefinition {
  return {
    name,
    category: "partOfSpeech",
    order,
    notes: `${name} notes`,
    score: 0,
  };
}

describe("resolveTags", () => {
  it("sorts tags by their order, then by name", () => {
    expect(
      resolveTags(
        ["vt", "v1", "P"],
        [tag("vt", 1), tag("v1", 1), tag("P", -5)],
      ).map((resolved) => resolved.name),
    ).toEqual(["P", "v1", "vt"]);
  });

  it("looks up a tag by the part of its name before a colon", () => {
    expect(resolveTags(["news:1"], [tag("news")])[0]?.notes).toBe("news notes");
  });

  it("keeps the full name of a tag looked up by its prefix", () => {
    expect(resolveTags(["news:1"], [tag("news")])[0]?.name).toBe("news:1");
  });

  it("gives an undefined tag an empty category", () => {
    expect(resolveTags(["rare"], [])[0]?.category).toBe("");
  });

  it("lists a repeated tag once", () => {
    expect(resolveTags(["v1", "v1"], [tag("v1")])).toHaveLength(1);
  });
});
