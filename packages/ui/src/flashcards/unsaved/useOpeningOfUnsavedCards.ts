import { useEffect, useLayoutEffect, useRef } from "react";
import type { EditedFlashcard } from "../editedFlashcard.ts";
import { useUnsavedCards } from "../SharedSavingContext.tsx";

/**
 * Opens in this media file's editor an unsaved card the user chose to open from the list,
 * whether the screen was already showing or has just been opened for it. `reopen` brings the card to the editor.
 */
export function useOpeningOfUnsavedCards(
  mediaFileId: string,
  reopen: (card: EditedFlashcard) => void,
) {
  const unsavedCards = useUnsavedCards();
  const latestReopen = useRef(reopen);
  useLayoutEffect(() => {
    latestReopen.current = reopen;
  });
  useEffect(() => {
    const openWaitingCard = () => {
      const card = unsavedCards.takeOpening(mediaFileId);
      if (card) latestReopen.current(card);
    };
    openWaitingCard();
    return unsavedCards.subscribe(openWaitingCard);
  }, [unsavedCards, mediaFileId]);
}
