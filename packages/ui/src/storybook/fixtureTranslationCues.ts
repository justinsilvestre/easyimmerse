import type { Cue } from "@easyimmerse/types";

/** German translations of the cues in `fixtures/sample.srt`, with the same timings. */
export const fixtureTranslationCues: Cue[] = [
  { index: 1, start_ms: 500, end_ms: 1500, text: "Die Katze schläft." },
  {
    index: 2,
    start_ms: 1750,
    end_ms: 3000,
    text: "Der Hund will fressen.\nEr hat Hunger.",
  },
  { index: 3, start_ms: 3250, end_ms: 4000, text: "Alles ist still." },
  { index: 4, start_ms: 4250, end_ms: 5000, text: "Gute Nacht." },
];
