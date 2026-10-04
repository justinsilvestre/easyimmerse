import { describe, expect, it } from "vitest";
import { pluralize } from "./pluralize.ts";

describe("pluralize", () => {
  it("uses the singular for one", () => {
    expect(pluralize(1, "card")).toBe("1 card");
  });

  it("adds an s for other counts", () => {
    expect(pluralize(0, "card")).toBe("0 cards");
  });

  it("uses the given plural", () => {
    expect(pluralize(2, "dictionary", "dictionaries")).toBe("2 dictionaries");
  });
});
