import type { EffectRunners } from "../app/runEffect.ts";
import { flashcardActions } from "./flashcardActions.ts";
import type { FlashcardsEffect } from "./flashcardsEffect.ts";
import { flashcardFieldsFromLookup } from "./lookupFields.ts";

/** Performs the flashcards' effect: the fields of a lookup are written with the platform's Markdown writer and reported at once. */
export const flashcardsEffectRunners = {
  writeFlashcardFields: (
    { requestId, results, context },
    { effects, dispatch },
  ) =>
    dispatch(
      flashcardActions.flashcardFieldsWritten(
        requestId,
        flashcardFieldsFromLookup(
          results,
          null,
          context,
          effects.writeDefinitionMarkdown,
        ),
      ),
    ),
} satisfies EffectRunners<FlashcardsEffect>;
