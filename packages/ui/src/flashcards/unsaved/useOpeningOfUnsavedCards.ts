import { useListMediaFilesQuery } from "@easyimmerse/backend";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { EditedFlashcard } from "../editedFlashcard.ts";
import { useUnsavedCards } from "../SharedSavingContext.tsx";
import { useGiveUpOpenings } from "./useGiveUpOpenings.ts";

/**
 * Opens in this media file's editor an unsaved card the user chose to open from the list,
 * whether the screen was already showing or has just been opened for it. `reopen` brings the card to the editor.
 * The card is taken once the project's media files have loaded and include this one;
 * if they fail to load, or this one is gone, the opening is given up as `useGiveUpOpenings` describes.
 */
export function useOpeningOfUnsavedCards(
  projectId: string,
  mediaFileId: string,
  reopen: (card: EditedFlashcard) => void,
) {
  const unsavedCards = useUnsavedCards();
  const { data, isError } = useListMediaFilesQuery(projectId);
  const isReady =
    data?.media_files.some((file) => file.id === mediaFileId) ?? false;
  useGiveUpOpenings(
    "mediaFileId",
    mediaFileId,
    isError || (data !== undefined && !isReady),
  );
  const latestReopen = useRef(reopen);
  useLayoutEffect(() => {
    latestReopen.current = reopen;
  });
  useEffect(() => {
    if (!isReady) return;
    const openWaitingCard = () => {
      const card = unsavedCards.takeOpening(mediaFileId);
      if (card) latestReopen.current(card);
    };
    openWaitingCard();
    return unsavedCards.subscribe(openWaitingCard);
  }, [unsavedCards, mediaFileId, isReady]);
}
