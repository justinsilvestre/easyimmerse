import verwandlungText from "@easyimmerse/fixtures/die-verwandlung.txt?raw";
import type { Document } from "@easyimmerse/types";

const partHeading = /^(I{1,3})\.$/;

/**
 * Kafka's "Die Verwandlung" in its three parts, split from the plain-text fixture the way the EPUB fixture divides it,
 * so that stories have a whole book without running the parser.
 */
export const exampleNovel: Document = {
  title: "Die Verwandlung",
  language: "de",
  chapters: splitIntoParts(verwandlungText),
};

/** The plain-text fixture as the parser returns it: one untitled chapter, with the lines still wrapped. */
export const examplePlainText: Document = {
  title: "",
  language: null,
  chapters: [
    {
      title: null,
      paragraphs: verwandlungText.split(/\n\s*\n/).map((block) => block.trim()),
    },
  ],
};

/** The small EPUB fixture's text: two short chapters. */
export const exampleShortBook: Document = {
  title: "Sample Book",
  language: "en",
  chapters: [
    {
      title: "Chapter One",
      paragraphs: [
        "The cat is sleeping on the windowsill.",
        "The dog wants to eat, and it is hungry.",
      ],
    },
    {
      title: "Chapter Two",
      paragraphs: [
        "Everything is quiet in the house.",
        "The cat says good night to the dog.",
      ],
    },
  ],
};

function splitIntoParts(text: string): Document["chapters"] {
  const chapters: Document["chapters"] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const heading = partHeading.exec(block.trim());
    if (heading) chapters.push({ title: heading[1] ?? null, paragraphs: [] });
    else chapters.at(-1)?.paragraphs.push(block.trim().replaceAll("--", "–"));
  }
  return chapters;
}
