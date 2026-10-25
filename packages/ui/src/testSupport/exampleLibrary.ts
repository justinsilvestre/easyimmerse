import type {
  LibraryEntry,
  LibraryItem,
  LibrarySegment,
  LibraryText,
  LibraryWord,
  MediaFile,
} from "@easyimmerse/types";

/** A published German video item of the library, with the given fields changed, for stories and tests. */
export function exampleLibraryItem(changes: Partial<LibraryItem> = {}) {
  return {
    id: "i1",
    title: "Im Park",
    description:
      "Two friends meet in a park on a sunny afternoon and talk about their dogs, their work, and their plans for the weekend.",
    translation_language: "en",
    kind: "video",
    difficulty: "A1",
    tags: ["conversation", "everyday"],
    file_name: "park.mp4",
    duration_ms: 95_000,
    cover: { kind: "automatic" },
    has_cover: false,
    segment_count: 2,
    status: { kind: "published" },
    created_at_ms: 1767225600000,
    updated_at_ms: 1767225600000,
    ...changes,
  } satisfies LibraryItem;
}

/** A picture of a sunny park, for stories that show a cover. */
export const exampleCoverUrl =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'><rect width='16' height='9' fill='%2359a14f'/><circle cx='12' cy='3' r='1.5' fill='%23f2d16b'/></svg>";

/** The sample video among the fixtures that Storybook serves, for stories that preview a video item's file. */
export const exampleVideoUrl = "/fixtures/sample.mp4";

/** Items of several kinds and tags, as the library lists them to a learner. */
export const exampleLibraryItems: readonly LibraryItem[] = [
  exampleLibraryItem(),
  exampleLibraryItem({
    id: "i2",
    title: "Nachrichten am Morgen",
    description: "A short radio news bulletin, read slowly.",
    kind: "audio",
    difficulty: "B1",
    tags: ["news"],
    file_name: "news.mp3",
    duration_ms: 240_000,
  }),
  exampleLibraryItem({
    id: "i3",
    title: "Rotkäppchen",
    description: "The folk tale of the girl in the red cap and the wolf.",
    kind: "document",
    difficulty: "C1",
    tags: ["stories"],
    file_name: "rotkaeppchen.txt",
    duration_ms: null,
  }),
];

/** Items in every status, as the library lists them to a library manager. */
export const exampleManagedLibraryItems: readonly LibraryItem[] = [
  ...exampleLibraryItems,
  exampleLibraryItem({
    id: "i4",
    title: "Im Café",
    status: { kind: "draft" },
    duration_ms: null,
  }),
  exampleLibraryItem({
    id: "i5",
    title: "Am Bahnhof",
    status: { kind: "processing" },
    duration_ms: null,
  }),
  exampleLibraryItem({
    id: "i6",
    title: "Beim Arzt",
    status: { kind: "failed", message: "The video file could not be read." },
    duration_ms: null,
  }),
];

const entry = (
  term: string,
  l1_definition: string,
  l2_definition = "",
): LibraryEntry => ({ term, reading: null, l1_definition, l2_definition });

const word = (start: number, end: number, wordEntry: LibraryEntry) =>
  ({ start, end, entry: wordEntry }) satisfies LibraryWord;

function segment(changes: Partial<LibrarySegment>) {
  return {
    index: 0,
    chapter_index: null,
    start_ms: null,
    end_ms: null,
    screenshot_at_ms: null,
    text: "",
    translation: null,
    words: [],
    ...changes,
  } satisfies LibrarySegment;
}

/** The text of the video item `i1`: three cues, with one word left without a definition and one cue without words. */
export const exampleLibraryVideoText: LibraryText = {
  segments: [
    segment({
      index: 0,
      start_ms: 500,
      end_ms: 1500,
      text: "Der Hund schläft.",
      translation: "The dog sleeps.",
      words: [
        word(0, 3, entry("der", "the")),
        word(4, 8, entry("Hund", "dog", "ein Haustier")),
        word(9, 16, entry("schlafen", "to sleep")),
      ],
    }),
    segment({
      index: 1,
      start_ms: 1750,
      end_ms: 3000,
      text: "Der Hund hat Hunger.",
      translation: "The dog is hungry.",
      words: [
        word(0, 3, entry("der", "the")),
        word(4, 8, entry("Hund", "dog", "ein Haustier")),
        word(9, 12, entry("haben", "to have")),
        word(13, 19, entry("Hunger", "")),
      ],
    }),
    segment({
      index: 2,
      start_ms: 3250,
      end_ms: 4000,
      text: "Gute Nacht.",
      translation: "Good night.",
    }),
  ],
  chapter_titles: [],
};

/** The text of a document item: one chapter of two paragraphs. */
export const exampleLibraryDocumentText: LibraryText = {
  segments: [
    segment({
      index: 0,
      chapter_index: 0,
      text: "Der Hund schläft.",
      words: [
        word(0, 3, entry("der", "the")),
        word(4, 8, entry("Hund", "dog", "ein Haustier")),
        word(9, 16, entry("schlafen", "to sleep")),
      ],
    }),
    segment({
      index: 1,
      chapter_index: 0,
      text: "Er träumt.",
      words: [word(3, 9, entry("träumen", "to dream"))],
    }),
  ],
  chapter_titles: ["Erstes Kapitel"],
};

/** The media file `m3` of project `p1`, added from the library item `i1`. */
export const exampleLibraryMediaFile: MediaFile = {
  id: "m3",
  project_id: "p1",
  name: "Im Park",
  source: { kind: "library", item_id: "i1" },
  created_at_ms: 1767225600000,
  track_selection_json: null,
  origin: null,
  translation_media_file_id: null,
  is_upload_chosen: false,
  has_stored_copy: false,
};
