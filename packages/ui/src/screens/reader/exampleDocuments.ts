import verwandlungText from "@easyimmerse/fixtures/die-verwandlung.txt?raw";
import translationText from "@easyimmerse/fixtures/sample-translation.txt?raw";
import translationAlignmentJson from "@easyimmerse/fixtures/sample-translation-alignment.json?raw";
import type {
  AddAlignmentRequest,
  Alignment,
  Document,
} from "@easyimmerse/types";

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

/**
 * The Spanish translation of the small EPUB fixture as the plain-text parser returns it:
 * one untitled chapter, whose paragraphs include the chapter titles.
 */
export const exampleShortBookTranslation: Document = {
  title: "",
  language: null,
  chapters: [
    {
      title: null,
      paragraphs: translationText
        .split(/\n\s*\n/)
        .map((block) => block.trim())
        .filter((block) => block !== ""),
    },
  ],
};

/**
 * The fixture alignment of the small EPUB fixture with its Spanish translation, one link per sentence,
 * saved for the book `mediaFileId` with its translation's media file `translationMediaFileId`.
 */
export function exampleShortBookAlignment(
  mediaFileId: string,
  translationMediaFileId: string,
): Alignment {
  const { provider, content } = JSON.parse(
    translationAlignmentJson,
  ) as AddAlignmentRequest;
  return {
    id: "a1",
    media_file_id: mediaFileId,
    provider,
    created_at_ms: 0,
    content:
      content.kind === "translation"
        ? { ...content, translation_media_file_id: translationMediaFileId }
        : content,
  };
}

function splitIntoParts(text: string): Document["chapters"] {
  const chapters: Document["chapters"] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const heading = partHeading.exec(block.trim());
    if (heading) chapters.push({ title: heading[1] ?? null, paragraphs: [] });
    else chapters.at(-1)?.paragraphs.push(block.trim().replaceAll("--", "–"));
  }
  return chapters;
}
