import type { Document } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { unwrapHardLineBreaks } from "./unwrapHardLineBreaks.ts";

function documentOf(paragraph: string): Document {
  return {
    title: "",
    language: null,
    chapters: [{ title: null, paragraphs: [paragraph] }],
  };
}

function unwrap(paragraph: string): string | undefined {
  return unwrapHardLineBreaks(documentOf(paragraph)).chapters[0]?.paragraphs[0];
}

describe("unwrapHardLineBreaks", () => {
  it("joins lines wrapped at a fixed width", () => {
    const line = "Als Gregor Samsa eines Morgens aus unruhigen Träumen";
    expect(unwrap(`${line}\n${line}\nerwachte.`)).toBe(
      `${line} ${line} erwachte.`,
    );
  });

  it("keeps the breaks between short lines", () => {
    expect(unwrap("Roses are red,\nviolets are blue.")).toBe(
      "Roses are red,\nviolets are blue.",
    );
  });
});
