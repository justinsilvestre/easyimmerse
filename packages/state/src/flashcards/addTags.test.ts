import { describe, expect, it } from "vitest";
import { addTags } from "./addTags.ts";

describe("addTags", () => {
  it("leaves out tags that are already present", () => {
    expect(addTags(["tv"], ["tv", "dark"])).toEqual(["tv", "dark"]);
  });
});
