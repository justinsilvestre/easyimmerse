import type { Cue } from "@easyimmerse/types";

/** A short scene in German, for tests of the media screen's cue navigation. */
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
