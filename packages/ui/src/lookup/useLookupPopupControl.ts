import { useRef } from "react";
import { doubleClickMs } from "../components/gestureTiming.ts";
import { useTimer } from "../hooks/useTimer.ts";
import { isSameOccurrence, type LookupRequest } from "./lookupPopup.ts";
import { useDictionaryLookup } from "./useDictionaryLookup.ts";
import { usePendingFlashcard } from "./usePendingFlashcard.ts";

/** Holds something, such as playback, while the pop-up is open, and lets it go when the pop-up closes or leads on elsewhere. */
export type PopupHold = {
  /** Called whenever the pop-up opens on a word. */
  hold(): void;
  /** Called when the pop-up closes with nothing to follow. */
  release(): void;
  /** Called when the pop-up gives way to something that keeps the hold, such as the flashcard editor. */
  forget(): void;
};

/**
 * Opens, moves and closes the dictionary pop-up, holding what `hold` holds while it is open.
 * Every explicit step (opening on a clicked word, searching, closing) drops a flashcard still waiting for its lookup;
 * following the mouse does not.
 */
export function useLookupPopupControl<S>(language: string, hold: PopupHold) {
  const lookup = useDictionaryLookup<S>(language);
  const pending = usePendingFlashcard();
  const closeTimer = useTimer();
  const isPointerInside = useRef(false);
  const show = (request: LookupRequest<S>) => {
    closeTimer.cancel();
    hold.hold();
    lookup.chooseWord(request);
  };
  const close = () => {
    closeTimer.cancel();
    pending.cancel();
    isPointerInside.current = false;
    lookup.close();
    hold.release();
  };
  return {
    lookup,
    pending,
    isPointerInside,
    showsOccurrence: (request: LookupRequest<S>) =>
      lookup.popup !== null &&
      isSameOccurrence(lookup.request?.occurrence, request.occurrence),
    /** Shows a word without dropping a waiting flashcard, as following the mouse does. */
    show,
    open: (request: LookupRequest<S>) => {
      pending.cancel();
      show(request);
    },
    close,
    /** Closes after the double-click interval, so that the second click of a double-click can still stop it. */
    closeSoon: () => closeTimer.restart(doubleClickMs, close),
    keepOpen: closeTimer.cancel,
    search: (term: string) => {
      pending.cancel();
      lookup.search(term);
    },
    openSearch: () => {
      pending.cancel();
      hold.hold();
      lookup.openSearch();
    },
    /** Closes the pop-up for something else that keeps the hold. */
    leaveFor: (next: () => void) => {
      closeTimer.cancel();
      pending.cancel();
      lookup.close();
      hold.forget();
      next();
    },
  };
}
