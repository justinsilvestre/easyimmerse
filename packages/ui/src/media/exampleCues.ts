import type { Cue } from "@easyimmerse/types";

/** A short scene in German, with its translation, for the media stories. */
export const exampleCues: readonly Cue[] = [
  { index: 1, start_ms: 500, end_ms: 2400, text: "Hast du das Licht gesehen?" },
  {
    index: 2,
    start_ms: 2800,
    end_ms: 5000,
    text: "Nein. Es war nur der Wind.",
  },
  {
    index: 3,
    start_ms: 5400,
    end_ms: 8200,
    text: "Der Hund will fressen.\nEr hat Hunger.",
  },
  { index: 4, start_ms: 8600, end_ms: 11_000, text: "Dann gib ihm etwas." },
  {
    index: 5,
    start_ms: 11_500,
    end_ms: 14_800,
    text: "Morgen fahren wir in die Stadt.",
  },
  {
    index: 6,
    start_ms: 15_200,
    end_ms: 17_900,
    text: "Vergiss den Schlüssel nicht.",
  },
  {
    index: 7,
    start_ms: 18_300,
    end_ms: 21_000,
    text: "<i>Alles</i> ist ruhig.",
  },
  { index: 8, start_ms: 21_500, end_ms: 23_000, text: "Gute Nacht." },
];

export const exampleTranslationCues: readonly Cue[] = [
  { index: 1, start_ms: 600, end_ms: 2500, text: "Did you see the light?" },
  { index: 2, start_ms: 2900, end_ms: 5100, text: "No. It was only the wind." },
  {
    index: 3,
    start_ms: 5500,
    end_ms: 8300,
    text: "The dog wants to eat.\nIt is hungry.",
  },
  {
    index: 4,
    start_ms: 8700,
    end_ms: 11_100,
    text: "Then give him something.",
  },
  {
    index: 5,
    start_ms: 11_600,
    end_ms: 14_900,
    text: "Tomorrow we are driving into town.",
  },
  { index: 6, start_ms: 15_300, end_ms: 18_000, text: "Don't forget the key." },
  { index: 7, start_ms: 18_400, end_ms: 21_100, text: "Everything is quiet." },
  { index: 8, start_ms: 21_600, end_ms: 23_100, text: "Good night." },
];

export const exampleFlashcardCueIndexes: readonly number[] = [3, 6];
