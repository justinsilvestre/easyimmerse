import type { FlashcardDraft } from "@easyimmerse/types";
import { useState } from "react";
import type { LookupFlashcardFields } from "../lookup/flashcardFieldsFromLookup.ts";
import { withinTime } from "../lookup/withinTime.ts";
import {
  type EditedFlashcard,
  reduceEditedFlashcard,
} from "./editedFlashcard.ts";
import { useUnsavedWorkTracking } from "./useUnsavedWorkTracking.ts";

/**
 * Saves new cards that left the editor before their word's lookup answered, once it answers, fails or takes too long.
 * `save` saves the card, filled from the lookup if it answered; a save the user asked for stays one, as its stage shows.
 */
export function useLateLookupSaves(save: (card: EditedFlashcard) => void) {
  const { track } = useUnsavedWorkTracking();
  const [lookups] = useState(
    () => new WeakMap<FlashcardDraft, Promise<LookupFlashcardFields | null>>(),
  );
  return {
    /** Remembers the lookup a new card's late fields come from, for waiting on it once the card has left the editor. */
    rememberLookup: (
      draft: FlashcardDraft,
      lateFields: Promise<LookupFlashcardFields | null>,
    ) => lookups.set(draft, lateFields),
    /** Waits up to `waitMs` for the lookup of a new card that left the editor, then saves the card filled from it. */
    saveAfterLookup: (card: EditedFlashcard, waitMs: number) => {
      if (card.kind !== "new") return;
      const { draft } = card;
      const lateFields = lookups.get(draft) ?? Promise.resolve(null);
      track(withinTime(lateFields, waitMs, null)).then((fields) => {
        const filled = reduceEditedFlashcard(
          card,
          fields
            ? { type: "lookupAnswered", draft, fields }
            : { type: "lookupFailed", draft },
        );
        if (filled) save(filled);
      });
    },
  };
}
