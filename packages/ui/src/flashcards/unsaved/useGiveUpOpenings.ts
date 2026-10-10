import { actions } from "@easyimmerse/state";
import { useEffect } from "react";
import { useAppDispatch } from "../../hooks/useAppDispatch.ts";
import { flashcardNotices } from "../flashcardNotices.ts";
import { useUnsavedCards } from "../SharedSavingContext.tsx";

/**
 * Gives up opening the listed cards whose `field` is `id`, which wait for a screen this component shows on the way to their editor.
 * Once `hasFailed`, as when the screen's data could not be loaded, each such card gets a notice saying it could not be opened.
 * When the component goes, as when the user navigates elsewhere first, their marks are cleared without a notice.
 * The cards stay listed either way.
 */
export function useGiveUpOpenings(
  field: "projectId" | "mediaFileId",
  id: string,
  hasFailed: boolean,
) {
  const store = useUnsavedCards();
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!hasFailed) return;
    const tellFailures = () => {
      for (const card of store.giveUpOpenings((card) => card[field] === id))
        dispatch(
          actions.noticeRequested(
            flashcardNotices.openFailed(card.card.editor.content.word),
          ),
        );
    };
    tellFailures();
    return store.subscribe(tellFailures);
  }, [store, dispatch, field, id, hasFailed]);
  useEffect(
    () => () => {
      store.giveUpOpenings((card) => card[field] === id);
    },
    [store, field, id],
  );
}
