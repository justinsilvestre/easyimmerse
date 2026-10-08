import { describe, expect, it } from "vitest";
import { sentencesNearView } from "./sentencesNearView.ts";
import { zeroWidthSpace } from "./unwrapHardLineBreaks.ts";

/** A paragraph of `count` sentences, "S0." to "S<count - 1>.", each followed by a space. */
function paragraphOf(count: number, prefix = "S"): string {
  return Array.from({ length: count }, (_, index) => `${prefix}${index}.`).join(
    " ",
  );
}

describe("sentencesNearView", () => {
  it("takes the sentences for two screens from the place in view, then those for one screen before it", () => {
    const paragraphs = [paragraphOf(3, "A"), paragraphOf(3, "B")];
    expect(
      sentencesNearView(paragraphs, { paragraphIndex: 1, offset: 4 }, "en", 5),
    ).toEqual(["B1.", "B2.", "B0.", "A2."]);
  });

  it("takes only the text near the place in view from a long paragraph", () => {
    const paragraph = paragraphOf(1000);
    const offset = paragraph.indexOf("S500.");
    expect(
      sentencesNearView([paragraph], { paragraphIndex: 0, offset }, "en", 5),
    ).toEqual(["S500.", "S501.", "S499."]);
  });

  it("leaves out sentences too long for a batch", () => {
    expect(
      sentencesNearView(
        [`${"a".repeat(2001)}. Kurz.`],
        { paragraphIndex: 0, offset: 0 },
        "de",
        3000,
      ),
    ).toEqual(["Kurz."]);
  });

  it("leaves out the zero-width spaces that join lines", () => {
    expect(
      sentencesNearView(
        [`猫が${zeroWidthSpace}寝る。`],
        { paragraphIndex: 0, offset: 0 },
        "ja",
        100,
      ),
    ).toEqual(["猫が寝る。"]);
  });
});
