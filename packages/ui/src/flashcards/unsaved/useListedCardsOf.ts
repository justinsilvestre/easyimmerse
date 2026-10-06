import type { Flashcard } from "@easyimmerse/types";
import { useSyncExternalStore } from "react";
import { useUnsavedCards } from "../SharedSavingContext.tsx";

/** The cards of a media file listed as not saved, by flashcard id, with the content of their edits. */
export function useListedCardsOf(
  mediaFileId: string,
): Pick<Flashcard, "id" | "content">[] {
  const store = useUnsavedCards();
  const listed = useSyncExternalStore(store.subscribe, store.list);
  return listed
    .filter((card) => card.mediaFileId === mediaFileId)
    .map((card) => ({
      id: card.flashcardId,
      content: card.card.editor.content,
    }));
}
