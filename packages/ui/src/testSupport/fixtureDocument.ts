import type { Document } from "@easyimmerse/types";

/**
 * A document shaped like the parse result of `fixtures/sample.epub`.
 * The first two paragraphs of each chapter are the fixture's text, and the rest extend it in the same style.
 */
export const fixtureDocument: Document = {
  title: "Sample Book",
  language: "en",
  chapters: [
    {
      title: "Chapter One",
      paragraphs: [
        "The cat is sleeping on the windowsill.",
        "The dog wants to eat, and it is hungry.",
        "Outside, the rain falls softly on the garden.",
        "A clock ticks slowly in the kitchen.",
      ],
    },
    {
      title: "Chapter Two",
      paragraphs: [
        "Everything is quiet in the house.",
        "The cat says good night to the dog.",
        "The lamp in the hallway goes dark.",
        "Soon the whole street is asleep.",
      ],
    },
  ],
};

const longChapterCount = 5;
const longParagraphCount = 30;

const sentences = [
  "The morning light spreads slowly across the old wooden floor.",
  "A neighbour waters the plants on her balcony and hums a quiet song.",
  "Somewhere down the street, a bicycle bell rings twice.",
  "The baker opens his shop, and the smell of fresh bread fills the air.",
  "Children run past the window on their way to school.",
  "An old man feeds the pigeons in the square, as he does every day.",
  "The river moves slowly under the stone bridge.",
];

/** A document with several long chapters, one of them untitled, for showing how the reader scrolls. */
export const fixtureLongDocument: Document = {
  title: "A Long Walk Through Town",
  language: "en",
  chapters: Array.from({ length: longChapterCount }, (_, chapterIndex) => ({
    title: chapterIndex === 2 ? null : `Part ${chapterIndex + 1}`,
    paragraphs: Array.from(
      { length: longParagraphCount },
      (_, paragraphIndex) => buildParagraph(chapterIndex + paragraphIndex),
    ),
  })),
};

function buildParagraph(seed: number): string {
  return Array.from(
    { length: 3 + (seed % 3) },
    (_, offset) => sentences[(seed + offset * 3) % sentences.length],
  ).join(" ");
}
