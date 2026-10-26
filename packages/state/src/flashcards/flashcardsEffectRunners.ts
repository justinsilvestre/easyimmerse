import type { AppAction } from "../app/appAction.ts";
import type { EffectRunners } from "../app/runEffect.ts";
import { lookupActions } from "../screen/lookup/lookupActions.ts";
import { createFlashcardId } from "./createFlashcardId.ts";
import { flashcardActions } from "./flashcardActions.ts";
import type { FlashcardStart, FlashcardsEffect } from "./flashcardsEffect.ts";
import { flashcardFieldsFromLookup } from "./lookupFields.ts";

/**
 * Performs the flashcards' effects: the fields of a lookup are written with the platform's Markdown writer and reported at once,
 * and a flashcard to start, or a library flashcard, gets a fresh id and is asked for at once.
 */
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
  startFlashcardWithNewId: ({ start }, { dispatch }) =>
    dispatch(startedUnder(createFlashcardId(), start)),
  createLibraryFlashcard: ({ place }, { dispatch }) =>
    dispatch(
      flashcardActions.libraryFlashcardStarted(place, createFlashcardId()),
    ),
} satisfies EffectRunners<FlashcardsEffect>;

/** The action that starts a flashcard under an id: asked for from its word's lookup, or started outright for no word. */
function startedUnder(
  id: string,
  { destination, draft, lookup }: FlashcardStart,
): AppAction {
  const flashcard = { id, draft };
  return lookup
    ? lookupActions.lookupFlashcardRequested(
        lookup.chosen,
        destination,
        flashcard,
        lookup.context,
      )
    : flashcardActions.flashcardStarted(flashcard, destination);
}
