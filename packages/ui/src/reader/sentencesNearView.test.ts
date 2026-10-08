import { describe, expect, it } from "vitest";
import { sentencesNearView } from "./sentencesNearView.ts";
import { zeroWidthSpace } from "./unwrapHardLineBreaks.ts";

/** A paragraph of `count` sentences, "S0." to "S<count - 1>.", each followed by a space. */
function paragraphOf(count: number, prefix = "S"): string {
  return Array.from({ length: count }, (_, index) => `${prefix}${index}.`).join(
    " ",
  );
}

const start = { paragraphIndex: 0, offset: 0 };

describe("sentencesNearView", () => {
  it("takes the paragraphs near the view from the place in view on, then those before it", () => {
    const paragraphs = ["A0.", "B0. B1.", "C0."];
    expect(
      sentencesNearView(
        paragraphs,
        { first: 0, last: 2 },
        { paragraphIndex: 1, offset: 0 },
        "en",
      ),
    ).toEqual(["B0.", "B1.", "C0.", "A0."]);
  });

  it("takes the paragraph of the place in view even when none near it was seen", () => {
    expect(
      sentencesNearView(["A0.", "B0."], { first: 1, last: 1 }, start, "en"),
    ).toEqual(["A0.", "B0."]);
  });

  it("takes only the text near the place in view from a long paragraph", () => {
    const paragraph = paragraphOf(1000);
    const offset = paragraph.indexOf("S500.");
    expect(
      sentencesNearView(
        [paragraph],
        { first: 0, last: 0 },
        { paragraphIndex: 0, offset },
        "en",
      ),
    ).not.toContain("S0.");
  });

  it("takes only the beginning of a long paragraph after the place in view", () => {
    expect(
      sentencesNearView(
        ["A0.", paragraphOf(1000)],
        { first: 0, last: 1 },
        start,
        "en",
      ),
    ).not.toContain("S999.");
  });

  it("leaves out sentences too long for a batch", () => {
    expect(
      sentencesNearView(
        [`${"a".repeat(2001)}. Kurz.`],
        { first: 0, last: 0 },
        start,
        "de",
      ),
    ).toEqual(["Kurz."]);
  });

  it("leaves out the zero-width spaces that join lines", () => {
    expect(
      sentencesNearView(
        [`猫が${zeroWidthSpace}寝る。`],
        { first: 0, last: 0 },
        start,
        "ja",
      ),
    ).toEqual(["猫が寝る。"]);
  });
});
