import type { FooterActivity } from "@easyimmerse/state";

const dictionariesPage = {
  step: { type: "openDictionaries" },
  label: "Show on the dictionaries page",
} as const;
const tokyoStory = {
  step: { type: "openProject", projectId: "tokyo-story" },
  label: "Show in Tokyo Story",
} as const;

/** Activities as the footer stories show them, one of each kind the app has or plans. */
export const sampleFooterActivities = {
  dictionaryImport: {
    id: "dictionary-import",
    label: "Adding jmdict_english.zip",
    opens: dictionariesPage,
    status: "running",
    percent: 42,
  },
  dictionaryImportFailed: {
    id: "dictionary-import",
    label: "A dictionary could not be added",
    opens: dictionariesPage,
    status: "failed",
  },
  mediaFetch: {
    id: "media-fetch-1",
    label: "Downloading video",
    opens: tokyoStory,
    status: "running",
    percent: 17,
  },
  mediaFetchFailed: {
    id: "media-fetch-1",
    label: "The media could not be added",
    opens: tokyoStory,
    status: "failed",
  },
  flashcardExport: {
    id: "flashcard-export",
    label: "Exporting an Anki package",
    opens: tokyoStory,
    status: "running",
    percent: null,
  },
  bookAlignment: {
    id: "book-alignment",
    label: "Aligning Der Prozess with its translation",
    opens: {
      step: { type: "openProject", projectId: "der-prozess" },
      label: "Show in Der Prozess",
    },
    status: "running",
    percent: 63,
  },
  subtitleGeneration: {
    id: "subtitle-generation",
    label: "Generating subtitles",
    opens: {
      step: { type: "openProject", projectId: "episode-3" },
      label: "Show in episode 3",
    },
    status: "running",
    percent: null,
  },
  pendingFlashcardSaves: {
    id: "flashcard-saves",
    label: "Saving 3 flashcards…",
    opens: null,
    status: "running",
    percent: null,
  },
} satisfies Record<string, FooterActivity>;
