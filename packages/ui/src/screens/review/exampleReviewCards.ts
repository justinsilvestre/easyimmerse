import {
  exampleFlashcard,
  exampleScreenshotUrl,
} from "../../components/flashcards/exampleFlashcard.ts";
import type { ReviewCardView } from "./ReviewCard.tsx";

/** A card made from the sample subtitles, with its screenshot, due for review, for stories. */
export const exampleReviewCard: ReviewCardView = {
  flashcardId: "f1",
  content: exampleFlashcard,
  screenshotUrl: exampleScreenshotUrl,
  audioUrl: null,
  isMediaUnavailable: false,
};

/** A card made in the reader from an ebook, which has no audio or screenshot, for stories. */
export const ebookReviewCard: ReviewCardView = {
  ...exampleReviewCard,
  flashcardId: "f2",
  content: {
    ...exampleFlashcard,
    word: "Lichtung",
    word_pronunciation: "[ˈlɪçtʊŋ]",
    l1_definition: "clearing (in a forest)",
    l2_definition: "baumfreie Stelle im Wald",
    text_context: "Am Rand der Lichtung blieb er stehen und lauschte.",
    text_context_translation:
      "At the edge of the clearing he stopped and listened.",
    text_context_pronunciation: "",
    audio_context: null,
    screenshot: null,
    tags: ["novel"],
  },
  screenshotUrl: null,
};

/** A card whose definitions and sentence run long, so that the revealed card is taller than a phone screen, for stories. */
export const longReviewCard: ReviewCardView = {
  ...exampleReviewCard,
  flashcardId: "f3",
  content: {
    ...exampleFlashcard,
    l1_definition: [
      "1. to eat (of an animal)",
      "2. (colloquial, of a person) to eat greedily; to wolf down",
      "3. (figurative) to consume, to swallow up: *Das Auto frisst viel Benzin.*",
      "4. (technical) to seize up, of a machine part",
    ].join("\n"),
    l2_definition: [
      "1. (von Tieren) feste Nahrung zu sich nehmen",
      "2. (umgangssprachlich, von Menschen) gierig, unmanierlich essen",
      "3. (übertragen) verbrauchen, verschlingen",
      "4. (Technik) sich festfressen",
    ].join("\n"),
    text_context:
      "Der Hund will fressen. Er hat seit heute Morgen nichts bekommen, und jetzt steht er vor der leeren Schüssel und schaut uns an, als hätten wir ihn vergessen.",
    text_context_translation:
      "The dog wants to eat. He has had nothing since this morning, and now he stands in front of the empty bowl and looks at us as if we had forgotten him.",
  },
};
