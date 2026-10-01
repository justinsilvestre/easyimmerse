import { describe, expect, it } from "vitest";
import { stripCueMarkup } from "./stripCueMarkup.ts";

describe("stripCueMarkup", () => {
  it("removes HTML-like tags", () => {
    expect(stripCueMarkup("<i>Everything</i> is quiet.")).toBe(
      "Everything is quiet.",
    );
  });

  it("removes WebVTT class and timestamp tags", () => {
    expect(stripCueMarkup("<c.yellow>Hi</c> <00:00:01.000>there")).toBe(
      "Hi there",
    );
  });

  it("removes SubStation Alpha override blocks", () => {
    expect(stripCueMarkup("{\\an8}On top")).toBe("On top");
  });

  it("decodes the character references WebVTT allows", () => {
    expect(stripCueMarkup("Tom &amp; Jerry &lt;3")).toBe("Tom & Jerry <3");
  });

  it("keeps line breaks", () => {
    expect(stripCueMarkup("One\n<b>Two</b>")).toBe("One\nTwo");
  });
});
