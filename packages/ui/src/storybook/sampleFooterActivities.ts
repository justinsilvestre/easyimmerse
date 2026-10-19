import type { FooterActivity } from "../components/FooterActivity.ts";

/** Activities as the footer stories show them, one of each kind the app has or plans. */
export const sampleFooterActivities = {
  dictionaryImport: {
    id: "dictionary-import",
    label: "Adding jmdict_english.zip",
    openLabel: "Show on the dictionaries page",
    status: "running",
    percent: 42,
  },
  dictionaryImportFailed: {
    id: "dictionary-import",
    label: "A dictionary could not be added",
    openLabel: "Show on the dictionaries page",
    status: "failed",
  },
  mediaFetch: {
    id: "media-fetch-1",
    label: "Downloading video",
    openLabel: "Show in Tokyo Story",
    status: "running",
    percent: 17,
  },
  mediaFetchFailed: {
    id: "media-fetch-1",
    label: "The video could not be fetched",
    openLabel: "Show in Tokyo Story",
    status: "failed",
  },
  flashcardExport: {
    id: "flashcard-export",
    label: "Exporting an Anki package",
    openLabel: "Show in Tokyo Story",
    status: "running",
    percent: null,
  },
  bookAlignment: {
    id: "book-alignment",
    label: "Aligning Der Prozess with its translation",
    openLabel: "Show in Der Prozess",
    status: "running",
    percent: 63,
  },
  subtitleGeneration: {
    id: "subtitle-generation",
    label: "Generating subtitles",
    openLabel: "Show in episode 3",
    status: "running",
    percent: null,
  },
  pendingFlashcardSaves: {
    id: "flashcard-saves",
    label: "Saving 3 flashcards…",
    openLabel: "Show the flashcards being saved",
    status: "running",
    percent: null,
  },
} satisfies Record<string, FooterActivity>;
